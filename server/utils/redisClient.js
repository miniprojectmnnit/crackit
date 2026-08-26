const Redis = require("ioredis");
const log = require("./logger");

let redisClient = null;
let isRedisAvailable = false;

/**
 * Returns a connected Redis client, or null if REDIS_URI is not configured.
 * This allows graceful fallback to in-memory state in local dev.
 */
function getRedisClient() {
  if (redisClient) return redisClient;

  const uri = process.env.REDIS_URI;

  if (!uri) {
    log.warn("REDIS", "⚠️  REDIS_URI not set — Redis features disabled. Falling back to in-memory state.");
    return null;
  }

  redisClient = new Redis(uri, {
    // Retry strategy: exponential backoff, max 10 seconds
    retryStrategy(times) {
      const delay = Math.min(times * 200, 10000);
      log.warn("REDIS", `Retry attempt ${times}. Retrying in ${delay}ms...`);
      return delay;
    },
    // Don't crash the app if Redis is unreachable
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    log.success("REDIS", "✅ Connected to Redis successfully.");
  });

  redisClient.on("error", (err) => {
    isRedisAvailable = false;
    log.error("REDIS", `Redis error: ${err.message}`);
  });

  redisClient.on("close", () => {
    isRedisAvailable = false;
    log.warn("REDIS", "Redis connection closed.");
  });

  return redisClient;
}

/**
 * Creates a DUPLICATE of the main Redis client.
 * IMPORTANT: In Redis Pub/Sub, a client that is subscribed to a channel
 * cannot issue regular commands (like GET/SET). So we always create a
 * separate "subscriber" client by duplicating the main one.
 */
function createSubscriber() {
  const client = getRedisClient();
  if (!client) return null;
  return client.duplicate();
}

/**
 * Checks if Redis is currently connected and available.
 */
function isRedisReady() {
  return redisClient !== null && isRedisAvailable;
}

module.exports = { getRedisClient, createSubscriber, isRedisReady };
