const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('🟢 Redis Connected successfully');
});

redisClient.on('error', (err) => {
  logger.error(`🔴 Redis connection error: ${err.message}`);
});

module.exports = redisClient;
