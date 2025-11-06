import { Redis } from "@upstash/redis";

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const CACHE_TTL = {
  COINS: 60, // 1 minute
  HISTORY: 300, // 5 minutes
  SEARCH: 3600, // 1 hour
};

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) {
    console.log(`[CACHE] Redis not configured, skipping cache for key: ${key}`);
    return null;
  }
  try {
    const data = await redis.get<T>(key);
    if (data) {
      console.log(`[CACHE HIT] Key: ${key}`);
    } else {
      console.log(`[CACHE MISS] Key: ${key}`);
    }
    return data;
  } catch (error) {
    console.error(`[CACHE ERROR] Get error for key ${key}:`, error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttl: number
): Promise<void> {
  if (!redis) {
    console.log(
      `[CACHE] Redis not configured, skipping cache set for key: ${key}`
    );
    return;
  }
  try {
    await redis.setex(key, ttl, value);
    console.log(`[CACHE SET] Key: ${key}, TTL: ${ttl}s`);
  } catch (error) {
    console.error(`[CACHE ERROR] Set error for key ${key}:`, error);
  }
}

export function getCacheKey(
  type: string,
  ...args: (string | number)[]
): string {
  return `crypto:${type}:${args.join(":")}`;
}

export { CACHE_TTL };
