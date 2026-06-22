import { Context, Next } from "hono";
import { ResponseHandler } from "../lib/response";
import { redis } from "../infra/redis";
import { logger } from "../infra/logger";

/**
 * Fixed-window per-IP rate limiter backed by Redis (INCR + EXPIRE).
 *
 * Protects unauthenticated auth endpoints from brute force / credential stuffing /
 * reset-token flooding. Fail-open: if Redis is unreachable the request is allowed
 * (availability over throttling) but the failure is logged.
 */
export const rateLimit = (opts: { windowSec: number; max: number; prefix: string }) =>
  async (c: Context, next: Next) => {
    const ip =
      (c.req.header("x-forwarded-for") || "").split(",")[0].trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const key = `ratelimit:${opts.prefix}:${ip}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, opts.windowSec);
      }
      if (count > opts.max) {
        const ttl = await redis.ttl(key);
        c.header("Retry-After", String(ttl > 0 ? ttl : opts.windowSec));
        return ResponseHandler.tooManyRequests(c, "Too many requests, please try again later");
      }
    } catch (err) {
      logger.error({ err, prefix: opts.prefix }, "[RateLimit] Redis error — failing open");
    }

    await next();
  };
