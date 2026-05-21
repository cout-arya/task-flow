const logger = require('../utils/logger');

let redisClient;

if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 10) return null; // Stop retrying after 10 attempts
      return Math.min(times * 50, 2000);
    },
  });

  redisClient.on('connect', () => logger.info('🟢 Redis Connected successfully'));
  redisClient.on('error', (err) => logger.error(`🔴 Redis connection error: ${err.message}`));
} else {
  logger.info('ℹ️  REDIS_URL not set — running without Redis cache');
  // Graceful no-op stub so the rest of the app works unchanged
  redisClient = {
    get: async () => null,
    setex: async () => { },
    del: async () => { },
    pipeline: () => ({ del: () => { }, exec: async () => { } }),
    scanStream: () => { const s = new (require('stream').Readable)({ objectMode: true, read() { this.push(null); } }); return s; },
  };
}

module.exports = redisClient;
