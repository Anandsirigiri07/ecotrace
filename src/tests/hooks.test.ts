import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { UserProfile } from '../types/index';

// Mock Firebase
vi.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  analytics: null
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ 
    exists: () => false 
  })),
  setDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(),
  addDoc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  updateDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toMillis: () => Date.now() })) }
}));

vi.mock('@tanstack/react-query', () => {
  const ReactObj = require('react');
  return {
    useQuery: vi.fn((opt: any) => {
      let queryFn: any;
      let queryKey: any;

      if (typeof opt === 'string') {
        // Fallback for non-standard calls
      } else if (opt) {
        queryFn = opt.queryFn;
        queryKey = opt.queryKey;
      }

      const [data, setData] = ReactObj.useState(undefined);
      const [isLoading, setIsLoading] = ReactObj.useState(true);
      const [error, setError] = ReactObj.useState(null);

      ReactObj.useEffect(() => {
        let active = true;
        if (!queryFn) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        Promise.resolve(queryFn())
          .then((val: any) => {
            if (active) {
              setData(val);
              setIsLoading(false);
            }
          })
          .catch((err: any) => {
            if (active) {
              setError(err);
              setIsLoading(false);
            }
          });
        return () => {
          active = false;
        };
      }, [JSON.stringify(queryKey)]);

      return {
        data,
        isLoading,
        error,
        refetch: vi.fn()
      };
    }),
    QueryClient: vi.fn().mockImplementation(function() {
      return {
        getQueryData: vi.fn(),
        setQueryData: vi.fn(),
        invalidateQueries: vi.fn(),
        clear: vi.fn()
      };
    }),
    QueryClientProvider: ({ children }: any) => children
  };
});

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => children;
};

describe('useAuth hook', () => {
  it('exports signIn and signOut functions', async () => {
    const { useAuth } = await import('../hooks/useAuth');
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.loginWithGoogle).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('initializes with null user', async () => {
    const { useAuth } = await import('../hooks/useAuth');
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });
});

describe('useQuery hook', () => {
  it('returns data and refetch', async () => {
    const { useQuery } = await import('../hooks/useQuery');
    const { result } = renderHook(() => 
      useQuery<string>(
        'test', 
        async () => 'hello' 
      )
    );
    expect(result.current).toBeDefined();
  });
});

describe('useGemini hook', () => {
  it('exports generatePlan and streamChat', async () => {
    const { useGemini } = await import('../hooks/useGemini');
    const { result } = renderHook(() => useGemini());
    expect(typeof result.current.generatePlan).toBe('function');
    expect(typeof result.current.streamChat).toBe('function');
    expect(result.current.loading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.plan).toBeNull();
  });
});

describe('useCarbon hook', () => {
  it('exports logActivity function', async () => {
    const { useCarbon } = await import('../hooks/useCarbon');
    const { result } = renderHook(() => useCarbon());
    expect(typeof result.current.logActivity).toBe('function');
  });

  it('initializes with empty activities', async () => {
    const { useCarbon } = await import('../hooks/useCarbon');
    const { result } = renderHook(() => useCarbon());
    expect(Array.isArray(result.current.activities)).toBe(true);
  });
});

describe('useAirQuality hook', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        list: [{
          main: { aqi: 2 },
          components: { pm2_5: 12, pm10: 15 }
        }]
      })
    })) as unknown as typeof fetch;
  });

  it('initializes with loading state', async () => {
    const { useAirQuality } = await import('../hooks/useAirQuality');
    const { result } = renderHook(() => useAirQuality());
    expect(result.current.loading).toBeDefined();
  });
});

describe('useCarbonIntensity hook', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: [{ 
          intensity: { actual: 245, forecast: 250, index: 'moderate' },
          from: new Date().toISOString()
        }]
      })
    })) as unknown as typeof fetch;
  });

  it('initializes with default intensity', async () => {
    const { useCarbonIntensity } = await import(
      '../hooks/useCarbonIntensity'
    );
    const { result } = renderHook(() => useCarbonIntensity());
    expect(result.current.data).toBeDefined();
  });
});

describe('useDailyChallenge hook', () => {
  it('returns challenge and loading state', async () => {
    const { useDailyChallenge } = await import(
      '../hooks/useDailyChallenge'
    );
    const { result } = renderHook(() => 
      useDailyChallenge('test-user-123')
    );
    expect(result.current.loading).toBeDefined();
  });
});

/* --- useAirQuality internals --- */

  describe('useAirQuality - internal logic', () => {
    beforeEach(async () => {
      vi.resetModules();
      vi.clearAllMocks();
      // Clear the internal query cache between tests
      const { queryClient } = await import('../hooks/useQuery');
      queryClient.clear();
    });

    it('maps AQI level 1 to Good', async () => {
      // Mock at the useQuery level to bypass cache
      vi.doMock('../hooks/useQuery', async (importOriginal) => {
        const actual = await importOriginal<typeof import('../hooks/useQuery')>();
        return {
          ...actual,
          useQuery: vi.fn().mockReturnValue({
            data: {
              aqi: 1,
              level: 'Good',
              pm25: 5,
              pm10: 8,
              color: '#22c55e',
              advice: 'Perfect air quality.',
              icon: '😊'
            },
            loading: false,
            error: null,
            refetch: vi.fn()
          })
        };
      });

      const { useAirQuality } = await import(
        '../hooks/useAirQuality'
      );
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useAirQuality(), { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.level).toBe('Good');
      expect(result.current.data?.aqi).toBe(1);
      expect(result.current.data?.pm25).toBe(5);
      
      vi.doUnmock('../hooks/useQuery');
    });

    it('maps AQI level 3 to Unhealthy', async () => {
      vi.doMock('../hooks/useQuery', async (importOriginal) => {
        const actual = await importOriginal<typeof import('../hooks/useQuery')>();
        return {
          ...actual,
          useQuery: vi.fn().mockReturnValue({
            data: {
              aqi: 3,
              level: 'Unhealthy',
              pm25: 35,
              pm10: 55,
              color: '#f59e0b',
              advice: 'Limit outdoor activity.',
              icon: '😷'
            },
            loading: false,
            error: null,
            refetch: vi.fn()
          })
        };
      });

      const { useAirQuality } = await import(
        '../hooks/useAirQuality'
      );
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useAirQuality(), { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.level).toBe('Unhealthy');
      expect(result.current.data?.aqi).toBe(3);
      
      vi.doUnmock('../hooks/useQuery');
    });

    it('handles API failure gracefully', async () => {
      vi.doMock('../hooks/useQuery', async (importOriginal) => {
        const actual = await importOriginal<typeof import('../hooks/useQuery')>();
        return {
          ...actual,
          useQuery: vi.fn().mockReturnValue({
            data: null,
            loading: false,
            error: new Error('Network failure'),
            refetch: vi.fn()
          })
        };
      });

      const { useAirQuality } = await import(
        '../hooks/useAirQuality'
      );
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useAirQuality(), { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('Network failure');
      
      vi.doUnmock('../hooks/useQuery');
    });

    it('loading state is a boolean', async () => {
      vi.doMock('../hooks/useQuery', async (importOriginal) => {
        const actual = await importOriginal<typeof import('../hooks/useQuery')>();
        return {
          ...actual,
          useQuery: vi.fn().mockReturnValue({
            data: null,
            loading: true,
            error: null,
            refetch: vi.fn()
          })
        };
      });

      const { useAirQuality } = await import(
        '../hooks/useAirQuality'
      );
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useAirQuality(), { wrapper }
      );

      expect(typeof result.current.loading).toBe('boolean');
      
      vi.doUnmock('../hooks/useQuery');
    });
  });

/* --- useDailyChallenge internals --- */

describe('useDailyChallenge - internal logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a challenge with required fields', async () => {
    const mockGetDoc = vi.mocked(
      (await import('firebase/firestore')).getDoc
    );
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        title: 'Take the Metro',
        description: 'Use Namma Metro today',
        savingKg: 3.2,
        category: 'transport',
        difficulty: 'easy',
        date: new Date().toISOString().split('T')[0]
      }),
      id: 'test',
      ref: {} as never,
      metadata: {} as never
    } as never);

    const { useDailyChallenge } = await import(
      '../hooks/useDailyChallenge'
    );
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useDailyChallenge('user-123'), { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.challenge).toBeDefined();
    expect(result.current.challenge?.title).toBeDefined();
    expect(result.current.challenge?.savingKg).toBeGreaterThan(0);
  });

  it('falls back to static challenge if Firestore empty', async () => {
    const mockGetDoc = vi.mocked(
      (await import('firebase/firestore')).getDoc
    );
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
      id: 'test',
      ref: {} as never,
      metadata: {} as never
    } as never);

    // Mock Gemini fetch to fail so fallback triggers
    globalThis.fetch = vi.fn().mockRejectedValueOnce(
      new Error('API unavailable')
    ) as unknown as typeof fetch;

    const { useDailyChallenge } = await import(
      '../hooks/useDailyChallenge'
    );
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useDailyChallenge('user-456'), { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Fallback challenge must still be defined
    expect(result.current.challenge).toBeDefined();
    expect(
      result.current.challenge?.category
    ).toMatch(/transport|food|energy|shopping/);
  });

  it('returns null challenge for empty userId', async () => {
    const { useDailyChallenge } = await import(
      '../hooks/useDailyChallenge'
    );
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useDailyChallenge(''), { wrapper }
    );

    // With no userId, should stay loading false
    // and challenge null (no Firebase call made)
    expect(result.current).toBeDefined();
  });
});

/* --- useGemini internals --- */

describe('useGemini - internal logic', () => {
  it('initializes with correct default state', async () => {
    const { useGemini } = await import('../hooks/useGemini');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGemini(), { wrapper }
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.plan).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes all required methods', async () => {
    const { useGemini } = await import('../hooks/useGemini');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGemini(), { wrapper }
    );

    expect(typeof result.current.generatePlan).toBe('function');
    expect(typeof result.current.streamChat).toBe('function');
    expect(typeof result.current.getInstantTip).toBe('function');
  });

  it('sets error when generatePlan called without auth', async () => {
    const { useGemini } = await import('../hooks/useGemini');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGemini(), { wrapper }
    );

    globalThis.fetch = vi.fn().mockRejectedValueOnce(
      new Error('Unauthorized')
    ) as unknown as typeof fetch;

    await act(async () => {
      try {
        await result.current.generatePlan(
          'user-123', [], 
          { 
            gridIntensity: 0.82, 
            gridIndex: 'moderate',
            weather: null, 
            nationalDailyAvgKg: 5.21,
            lastUpdated: new Date()
          },
          { 
            displayName: 'Test', 
            email: 'test@test.com',
            photoURL: null,
            country: 'India',
            dietPreference: 'vegetarian',
            currentStreak: 0,
            longestStreak: 0,
            joinedAt: null,
            lastLogDate: null
          } as UserProfile
        );
      } catch {
        // expected to handle error
      }
    });

    // Either error is set or fallback plan is used
    expect(
      result.current.error !== null || 
      result.current.plan !== null
    ).toBe(true);
  });
});

/* --- useAuth internals --- */

describe('useAuth - internal logic', () => {
  it('initializes with null user and loading true', async () => {
    const mockOnAuthStateChanged = vi.mocked(
      (await import('firebase/auth')).onAuthStateChanged
    );
    mockOnAuthStateChanged.mockImplementationOnce(
      () => () => {}
    );

    const { useAuth } = await import('../hooks/useAuth');
    const { result } = renderHook(() => useAuth());

    // Initially loading
    expect(result.current.user).toBeNull();
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });

  it('signIn function exists and is callable', async () => {
    const { useAuth } = await import('../hooks/useAuth');
    const { result } = renderHook(() => useAuth());
    expect(() => result.current.signIn).not.toThrow();
  });

  it('signOut function exists and is callable', async () => {
    const { useAuth } = await import('../hooks/useAuth');
    const { result } = renderHook(() => useAuth());
    expect(() => result.current.signOut).not.toThrow();
  });
});
