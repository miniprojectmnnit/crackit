const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClient } = require("../utils/redisClient");
const log = require("../utils/logger");

/**
 * Custom key generator:
 * - Authenticated (Clerk): rate-limit by Clerk User ID (prevents unfair blocking
 *   when many users share an IP, e.g., university library)
 * - Unauthenticated: rate-limit by IP address (IPv4 + IPv6 safe)
 */
const keyGenerator = (req) => {
  // Clerk-authenticated user
  if (req.auth?.userId) {
    return `rl:user:${req.auth.userId}`;
  }
  // Extension bridge token user
  if (req.extensionAuth?.userId) {
    return `rl:user:${req.extensionAuth.userId}`;
  }
  // Fallback to IP address — normalize IPv6 to prevent bypass tricks
  // req.ip respects X-Real-IP set by NGINX (see nginx.conf)
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  // Normalize IPv6-mapped IPv4 (e.g. ::ffff:1.2.3.4 -> 1.2.3.4)
  const normalized = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  return `rl:ip:${normalized}`;
};

/**
 * Builds a rate limiter with either a Redis store (multi-container safe)
 * or the default memory store (single-process fallback for local dev).
 */
function buildLimiter({ windowMs, max, message }) {
  const redis = getRedisClient();

  const limiterOptions = {
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,  // Sends X-RateLimit-* headers in every response
    legacyHeaders: false,    // Disables deprecated X-RateLimit headers
    message: { error: message },
    // Disable the built-in IPv6 key check — we handle normalization ourselves above
    validate: { keyGeneratorIpFallback: false },
    handler: (req, res, next, options) => {
      log.warn("RATE", `🚫 Rate limit hit — Key: ${keyGenerator(req)}`);
      res.status(options.statusCode).json(options.message);
    },
  };

  if (redis) {
    log.success("RATE", "✅ Rate limiter using Redis store (multi-container safe).");
    limiterOptions.store = new RedisStore({
      // ioredis uses `.call()` for arbitrary commands
      sendCommand: (...args) => redis.call(...args),
    });
  } else {
    log.warn("RATE", "⚠️  Rate limiter using in-memory store (single-process only).");
  }

  return rateLimit(limiterOptions);
}

/**
 * GLOBAL LIMITER — Applied to every incoming request.
 * Protects general API stability.
 * Limit: 100 requests per minute per user/IP.
 */
const globalLimiter = buildLimiter({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: "Too many requests. Please wait a moment and try again.",
});

/**
 * EXPENSIVE LIMITER — Applied only to LLM + Judge0 endpoints.
 * These call external paid APIs. Protecting them prevents quota exhaustion.
 * Limit: 15 requests per minute per user/IP.
 *
 * Endpoints covered:
 *   POST /api/interviews/session/:id/execute  → Judge0 code runner
 *   POST /api/interviews/session/:id/evaluate → Groq LLM evaluator
 */
const expensiveLimiter = buildLimiter({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: "You are submitting too fast. Please wait 60 seconds before running code or evaluating again.",
});

module.exports = { globalLimiter, expensiveLimiter };
