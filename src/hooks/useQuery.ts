import { QueryClient, useQuery as useTanStackQuery } from '@tanstack/react-query';

// Global QueryClient instance exported for main.tsx and hook invalidations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default stale time
      refetchOnWindowFocus: false,
    },
  },
});

interface QueryOptions {
  staleTime?: number; // ms
}

/**
 * A lightweight custom query hook wrapper that delegates to TanStack React Query.
 * Retains original signature for seamless integration with existing hooks.
 */
export function useQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
) {
  const result = useTanStackQuery<T, Error>({
    queryKey: [queryKey],
    queryFn,
    staleTime: options.staleTime,
  });

  return {
    data: result.data ?? null,
    loading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Invalidates cache entries matching the given key prefix.
 * Useful for purging cache on mutations.
 */
export const invalidateCache = (keyPrefix: string) => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.startsWith(keyPrefix);
    }
  });
};

export default useQuery;
