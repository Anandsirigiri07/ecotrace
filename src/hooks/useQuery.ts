import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global in-memory cache store
const queryCache = new Map<string, CacheEntry<any>>();

interface QueryOptions {
  staleTime?: number; // ms
}

/**
 * A lightweight custom query hook that mimics React Query's caching behavior.
 * Caches asynchronous fetch functions and returns loading, error, and data states.
 * 
 * @param queryKey Unique key to identify the query cache entry
 * @param queryFn Async function returning the data
 * @param options Configurations (e.g. staleTime)
 */
export function useQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const staleTime = options.staleTime ?? 60000; // Default: 1 minute stale time

  const execute = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const cached = queryCache.get(queryKey);
      const now = Date.now();

      // Serve from cache if fresh and not a forced refetch
      if (!force && cached && now - cached.timestamp < staleTime) {
        setData(cached.data);
        setLoading(false);
        return;
      }

      const result = await queryFn();
      queryCache.set(queryKey, { data: result, timestamp: now });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [queryKey, queryFn, staleTime]);

  useEffect(() => {
    execute();
  }, [queryKey]);

  const refetch = useCallback(() => execute(true), [execute]);

  return { data, loading, error, refetch };
}

/**
 * Invalidates cache entries matching the given key prefix.
 * Useful for purging cache on mutations (e.g., when a user logs an activity).
 * 
 * @param keyPrefix Prefix of the cache keys to invalidate
 */
export const invalidateCache = (keyPrefix: string) => {
  for (const key of queryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      queryCache.delete(key);
    }
  }
};
export default useQuery;
