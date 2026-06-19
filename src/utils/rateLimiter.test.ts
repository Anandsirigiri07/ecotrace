import { checkRateLimit, rateLimits } from './rateLimiter';

describe('rateLimiter', () => {
  it('allows single request', () => {
    const res = checkRateLimit('key1', 3, 1000);
    expect(res.allowed).toBe(true);
    expect(res.waitMs).toBe(0);
  });

  it('allows requests up to maxRequests', () => {
    expect(checkRateLimit('key2', 2, 1000).allowed).toBe(true);
    expect(checkRateLimit('key2', 2, 1000).allowed).toBe(true);
    
    const limit = checkRateLimit('key2', 2, 1000);
    expect(limit.allowed).toBe(false);
    expect(limit.waitMs).toBeGreaterThan(0);
  });

  it('resets after window time', async () => {
    expect(checkRateLimit('key3', 1, 50).allowed).toBe(true);
    expect(checkRateLimit('key3', 1, 50).allowed).toBe(false);
    
    // Wait for reset
    await new Promise(resolve => setTimeout(resolve, 60));
    
    const limit = checkRateLimit('key3', 1, 50);
    expect(limit.allowed).toBe(true);
  });

  it('rateLimits preconfigured helpers work', () => {
    const act = rateLimits.activityLog('user1');
    expect(act.allowed).toBe(true);
    
    const gem = rateLimits.geminiCall('user1');
    expect(gem.allowed).toBe(true);
    
    const auth = rateLimits.authAttempt('user1');
    expect(auth.allowed).toBe(true);
  });
});
