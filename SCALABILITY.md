# 📈 Scalability Architecture — TaskFlow API

> This document outlines the architectural decisions and scalability strategies built into the TaskFlow REST API.

---

## Current Architecture

```
Client (React) → Nginx → Node.js/Express → MongoDB Atlas
```

The application is designed **stateless-first**, enabling horizontal scaling from day one.

---

## 1. Stateless JWT Authentication

**Current**: JWT tokens are signed and verified server-side with no session storage. Any server instance can validate any token.

**Benefit**: Zero session affinity → add any number of backend instances behind a load balancer with no coordination required.

**Future**: Add Redis for token blacklisting (logout/revoke) without breaking statelessness.

```
User → [Load Balancer] → [Node Instance 1]
                       → [Node Instance 2]  ← Any instance handles any request
                       → [Node Instance N]
```

---

## 2. Modular Architecture (Microservice-Ready)

Each feature is self-contained in its own module:

```
src/modules/
├── auth/     → Auth Service
├── tasks/    → Task Service  
└── admin/    → Admin Service
```

**Extraction path**: Each module can become an independent microservice with its own:
- Express app + port
- MongoDB collection
- Docker container
- Kubernetes pod

The only coupling is the `User` model referenced by `Task.owner` — solved with an API call or shared user ID via JWT.

---

## 3. Database — MongoDB Atlas

| Feature | Benefit |
|---|---|
| Auto-scaling | Atlas auto-scales storage and IOPS |
| Sharding | Shard `tasks` collection by `owner` for horizontal data scaling |
| Replica Sets | 3-node replica set for high availability (99.995% uptime SLA) |
| Multi-region | Deploy Atlas clusters across AWS regions for geo-redundancy |
| Indexes | Compound indexes on `{owner, status}` and `{owner, priority}` ensure sub-ms queries at scale |

**Indexing strategy** (already implemented):
```js
taskSchema.index({ owner: 1, status: 1 });    // Most common query
taskSchema.index({ owner: 1, priority: 1 });   // Priority filter
taskSchema.index({ createdAt: -1 });            // Pagination sort
```

---

## 4. Caching with Redis (Optional / Future)

**Use cases**:
- Cache `/api/v1/admin/stats` (expensive aggregation) with 60s TTL
- Cache user task lists per user ID with 30s TTL
- JWT blacklist for token revocation on logout

```
Request → Check Redis cache
            ├── HIT  → Return cached response (< 1ms)
            └── MISS → Query MongoDB → Store in Redis → Return
```

**Implementation**: Drop in `ioredis` + wrap controller responses:
```js
const cached = await redis.get(`tasks:${userId}`);
if (cached) return res.json(JSON.parse(cached));
// ...fetch from DB, then:
await redis.setex(`tasks:${userId}`, 30, JSON.stringify(data));
```

---

## 5. Docker & Container Deployment

**Dockerfile** (backend):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports: ["5000:5000"]
    env_file: ./backend/.env
    restart: unless-stopped
    
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]
```

---

## 6. Load Balancing with Nginx

```nginx
upstream taskflow_backend {
    least_conn;
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}

server {
    listen 80;
    location /api/ { proxy_pass http://taskflow_backend; }
    location / { root /var/www/frontend; try_files $uri /index.html; }
}
```

---

## 7. Horizontal Scaling Path

| Stage | Users | Architecture |
|---|---|---|
| **Now** | < 1K | Single Node.js + MongoDB Atlas M10 |
| **Phase 2** | 1K–10K | 2-3 Node.js instances + ALB + Redis |
| **Phase 3** | 10K–100K | Microservices + Kubernetes + Redis Cluster |
| **Phase 4** | 100K+ | Event-driven (Kafka) + CQRS + MongoDB sharding |

---

## 8. API Rate Limiting

Already implemented:
- **Global**: 100 requests / 15 minutes per IP
- **Auth endpoints**: 20 requests / 15 minutes per IP (brute-force protection)

**Future**: Move to Redis-backed rate limiting with `rate-limit-redis` for distributed accuracy across multiple instances.

---

## 9. Monitoring & Observability

**Current**: Winston structured logging to console + files.

**Future additions**:
- **APM**: Datadog or New Relic for distributed tracing
- **Metrics**: Prometheus + Grafana for request rate, latency, error rate
- **Alerts**: PagerDuty for SLA breach notifications
- **Health checks**: `/health` endpoint for load balancer health probes

---

*Scalability is not an afterthought — it's baked into every architectural decision.*
