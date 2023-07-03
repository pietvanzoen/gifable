import type { IRateLimiterOptions } from "rate-limiter-flexible";
import { RateLimiterMemory } from "rate-limiter-flexible";

declare global {
  var __rateLimiters: Map<string, RateLimiterMemory>;
}

if (!global.__rateLimiters) {
  global.__rateLimiters = new Map<string, RateLimiterMemory>();
}

export function rateLimiter(
  options: IRateLimiterOptions & { keyPrefix: string }
) {
  let rateLimiter = global.__rateLimiters.get(options.keyPrefix);
  if (!rateLimiter) {
    rateLimiter = new RateLimiterMemory(options);

    global.__rateLimiters.set(options.keyPrefix, rateLimiter);
  }

  return rateLimiter;
}
