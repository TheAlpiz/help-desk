import { createClient } from "redis";
import { env } from "../env";
import { logger } from "../logger";

export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (err: Error) => logger.error(err, "Redis Client Error"));

export const connectRedis = async () => {
  await redis.connect();
  logger.info("Connected to Redis");
};
