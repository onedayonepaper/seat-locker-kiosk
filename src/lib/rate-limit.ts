/**
 * In-memory rate limiter
 * For production with multiple instances, use Redis-based solution (e.g., Upstash)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store - will reset on server restart
const rateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
}

// Default configurations
export const RATE_LIMIT_CONFIGS = {
  // Standard API rate limit
  default: {
    windowMs: 60 * 1000,  // 1 minute
    max: 100,             // 100 requests per minute
  } as RateLimitConfig,

  // Stricter limit for authentication
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 attempts per 15 minutes
  } as RateLimitConfig,

  // Limit for check-in/check-out operations
  checkin: {
    windowMs: 60 * 1000,  // 1 minute
    max: 30,              // 30 requests per minute
  } as RateLimitConfig,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

/**
 * Check if a request is within rate limit
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.default
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Periodically clean up expired entries (1% chance per request)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now);
  }

  let entry = rateLimitMap.get(key);

  // Create new entry if doesn't exist or has expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitMap.set(key, entry);

    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: entry.resetAt,
      retryAfterMs: 0,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: entry.resetAt,
    retryAfterMs: 0,
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or admin override
 */
export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

/**
 * Get client IP from request
 * Handles common proxy headers
 */
export function getClientIP(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Get the first IP in the chain (client IP)
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 1 : 0)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : {
      'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
    }),
  };
}
