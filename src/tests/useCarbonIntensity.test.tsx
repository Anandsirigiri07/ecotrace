import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  analytics: null
}));

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useCarbonIntensity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default intensity data on init', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            intensity: {
              actual: 210,
              forecast: 220,
              index: 'moderate'
            },
            from: new Date().toISOString()
          }]
        })
      })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const { useCarbonIntensity } = await import(
      '../hooks/useCarbonIntensity'
    );
    const { result } = renderHook(() => useCarbonIntensity(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.data).toBeDefined();
  });

  it('has a getLabel function', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            intensity: {
              actual: 210,
              forecast: 220,
              index: 'low'
            },
            from: new Date().toISOString()
          }]
        })
      })
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const { useCarbonIntensity } = await import(
      '../hooks/useCarbonIntensity'
    );
    const { result } = renderHook(() => useCarbonIntensity(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.getLabel).toBe('function');
    const label = result.current.getLabel();
    expect(label).toHaveProperty('text');
    expect(label).toHaveProperty('tip');
    expect(label).toHaveProperty('color');
  });

  it('handles fetch failure gracefully', async () => {
    const mockFetch = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const { useCarbonIntensity } = await import(
      '../hooks/useCarbonIntensity'
    );
    const { result } = renderHook(() => useCarbonIntensity(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    // Should fall back to default values, not crash
    expect(result.current.data.intensity).toBeGreaterThan(0);
  });

  it('loading state is a boolean', async () => {
    const mockFetch = vi.fn(() => new Promise(() => {}));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const { useCarbonIntensity } = await import(
      '../hooks/useCarbonIntensity'
    );
    const { result } = renderHook(() => useCarbonIntensity(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.loading).toBe('boolean');
  });
});
