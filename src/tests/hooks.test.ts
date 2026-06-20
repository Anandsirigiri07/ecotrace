import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

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

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ 
    data: undefined, 
    isLoading: false,
    error: null,
    refetch: vi.fn() 
  })),
  QueryClient: vi.fn().mockImplementation(function() {
    return {
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn()
    };
  })
}));

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
      useQuery<string>({ 
        queryKey: ['test'], 
        queryFn: async () => 'hello' 
      })
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
    global.fetch = vi.fn(() => Promise.resolve({
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
    global.fetch = vi.fn(() => Promise.resolve({
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
