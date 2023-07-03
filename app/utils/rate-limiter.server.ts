import type { IRateLimiterOptions } from "rate-limiter-flexible";
import { RateLimiterRes } from "rate-limiter-flexible";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { tooManyRequests } from "./request.server";
import debug from "debug";
const log = debug("app:rate-limiter");

declare global {
  var __rateLimiters: Map<string, RateLimiterMemory>;
}

if (!global.__rateLimiters) {
  global.__rateLimiters = new Map<string, RateLimiterMemory>();
}

export type RateLimiterOptions = IRateLimiterOptions & { keyPrefix: string };

export function rateLimiter(options: RateLimiterOptions) {
  let rateLimiter = global.__rateLimiters.get(options.keyPrefix);
  if (!rateLimiter) {
    rateLimiter = new RateLimiterMemory(options);

    global.__rateLimiters.set(options.keyPrefix, rateLimiter);
  }

  return rateLimiter;
}

export async function isRateLimited(
  key: string,
  options: RateLimiterOptions
): Promise<null | RateLimiterRes> {
  const rl = rateLimiter(options);
  const { keyPrefix } = options;

  if (!key) {
    throw new Error("key is required");
  }

  try {
    const res = await rl.consume(key);
    log(`Rate limit remaining for ${keyPrefix}:${key}`, res.remainingPoints);
  } catch (res) {
    if (res instanceof RateLimiterRes) {
      log(`Rate limit exceeded for ${keyPrefix}:${key}`, { res });
      return res;
    }
    throw res;
  }

  return null;
}

export function rateLimitError(res: RateLimiterRes, data?: any) {
  return tooManyRequests({
    ...data,
    message: `Too many requests. You can try again in ${Math.round(
      res.msBeforeNext / 1000
    )} seconds.`,
  });
}
