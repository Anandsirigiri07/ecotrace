interface RateLimit {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimit>();

/**
 * Checks if a request is within rate limit bounds.
 * Uses in-memory sliding window per key.
 * @param key - Unique identifier for rate limit bucket
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed boolean and waitMs remaining
 */
export const checkRateLimit = (
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; waitMs: number } => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { 
      count: 1, 
      resetAt: now + windowMs 
    });
    return { allowed: true, waitMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return { 
      allowed: false, 
      waitMs: entry.resetAt - now 
    };
  }

  entry.count++;
  return { allowed: true, waitMs: 0 };
};

/**
 * Application-specific rate limits configured for user activity.
 * Sets maximum limits for logs, Gemini calls, and auth attempts.
 */
export const rateLimits = {
  activityLog: (uid: string) =>
    checkRateLimit(`log_${uid}`, 10, 60_000),
  geminiCall: (uid: string) =>
    checkRateLimit(`gemini_${uid}`, 5, 600_000),
  authAttempt: (uid: string) =>
    checkRateLimit(`auth_${uid}`, 3, 60_000)
};
