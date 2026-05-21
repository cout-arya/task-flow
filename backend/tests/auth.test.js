const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../src/models/User');
const redis = require('../src/config/redis');

let server;

beforeAll(async () => {
  server = app.listen(0); // random available port
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /^test_/ } });
  await mongoose.connection.close();
  await redis.quit();
  server.close();
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test Auth User',
    email: `test_auth_${Date.now()}@example.com`,
    password: 'password123',
  };
  let authToken;

  // ─── REGISTER ───────────────────────────────────────────────
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.password).toBeUndefined(); // password should not be exposed
      authToken = res.body.data.token;
    });

    it('should fail with duplicate email (409)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already registered/i);
    });

    it('should fail with missing fields (400)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'incomplete@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid email format (400)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Bad', email: 'not-an-email', password: 'pass123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should fail with short password (400)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Short', email: 'short@test.com', password: '12' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── LOGIN ──────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      authToken = res.body.data.token;
    });

    it('should fail with wrong password (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should fail with non-existent email (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'pass123' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET ME ─────────────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
    });

    it('should fail without token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtokenvalue123')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});
