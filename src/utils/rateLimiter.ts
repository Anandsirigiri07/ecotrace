interface RateLimit {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimit>();

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

export const rateLimits = {
  activityLog: (uid: string) =>
    checkRateLimit(`log_${uid}`, 10, 60_000),
  geminiCall: (uid: string) =>
    checkRateLimit(`gemini_${uid}`, 5, 600_000),
  authAttempt: (uid: string) =>
    checkRateLimit(`auth_${uid}`, 3, 60_000)
};
