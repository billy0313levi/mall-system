const Redis = require('ioredis');
const env = require('../config/env');

let redisClient;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password || undefined,
      lazyConnect: false,
      maxRetriesPerRequest: null
    });
  }

  return redisClient;
}

module.exports = {
  getRedisClient
};

