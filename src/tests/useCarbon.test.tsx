import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCarbon } from '../hooks/useCarbon';
import { addDoc, updateDoc } from 'firebase/firestore';

// Global variables to control the mock state of getDoc dynamically per test
let lastLogDateMock = '2026-06-18';
let currentStreakMock = 2;
let getDocShouldFail = false;
let failNextGetDoc = false;

// Wrapper creator for TanStack React Query context inside hooks testing
const createWrapper = () => {
  const queryClientInstance = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClientInstance}>
      {children}
    </QueryClientProvider>
  );
};

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-999' }
  })
}));

// Mock the firebase service to return a dummy db, auth, and analytics object
vi.mock('../services/firebase', () => ({
  db: { type: 'mock-firestore-db' },
  auth: { currentUser: { uid: 'test-user-999' } },
  analytics: { type: 'mock-analytics' }
}));

// Mock the query client wrapper
vi.mock('../hooks/useQuery', () => ({
  queryClient: {
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue({})
  },
  useQuery: vi.fn((_key, _fn) => {
    // Return mock query states
    return { data: [], loading: false, error: null, refetch: vi.fn() };
  }),
  invalidateCache: vi.fn()
}));

// Mock firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-activity-id' }),
  onSnapshot: vi.fn((_q, arg2, arg3) => {
    const callback = typeof arg2 === 'function' ? arg2 : arg3;
    if (callback) {
      setTimeout(() => {
        callback({
          docs: [
            {
              id: 'act-1',
              data: () => ({
                category: 'transport',
                activityType: 'car_petrol',
                quantity: 15,
                unit: 'km',
                co2Kg: 3.15,
                date: new Date().toISOString().split('T')[0],
                userId: 'test-user-999',
                geminiTip: 'Good job'
              })
            }
          ]
        });
      }, 0);
    }
    return () => {};
  }),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'timestamp'),
  doc: vi.fn().mockReturnValue({}),
  getDoc: vi.fn().mockImplementation(async (_ref) => {
    if (getDocShouldFail) {
      throw new Error('Firestore read failure');
    }
    if (failNextGetDoc) {
      failNextGetDoc = false; // Reset toggle
      throw new Error('Firestore write failure');
    }
    return {
      exists: () => true,
      data: () => ({
        currentStreak: currentStreakMock,
        longestStreak: 5,
        lastLogDate: lastLogDateMock
      })
    };
  }),
  updateDoc: vi.fn().mockResolvedValue({})
}));

// Mock rateLimiter and sanitize
vi.mock('../utils/rateLimiter', () => ({
  rateLimits: {
    activityLog: () => ({ allowed: true, waitMs: 0 })
  }
}));

describe('useCarbon Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastLogDateMock = '2026-06-18';
    currentStreakMock = 2;
    getDocShouldFail = false;
    failNextGetDoc = false;
  });

  it('subscribes to activities on snapshot and calculates initial summary', async () => {
    const { result } = renderHook(() => useCarbon('test-user-999'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities.length).toBe(0); // Query cache mock returns empty array
  });

  it('saves new activities and triggers streak updates', async () => {
    const { result } = renderHook(() => useCarbon('test-user-999'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let newId;
    await act(async () => {
      newId = await result.current.logActivity(
        'transport',
        'bus',
        10,
        'km',
        0.89,
        'Nice bus ride'
      );
    });

    expect(newId).toBe('new-activity-id');
    expect(addDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();
  });

  it('updates settings in user profile', async () => {
    const { result } = renderHook(() => useCarbon('test-user-999'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfileSettings('USA', 'Vegan');
    });

    expect(updateDoc).toHaveBeenCalled();
  });

  it('handles streak updates when activity is logged today already', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    lastLogDateMock = todayStr;

    const { result } = renderHook(() => useCarbon('test-user-999'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.logActivity(
        'transport',
        'bus',
        10,
        'km',
        0.89,
        'Logged again today'
      );
    });

    // Should not call updateDoc for streak since last log date is today
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('starts a new streak when last logged date is older', async () => {
    lastLogDateMock = '2020-01-01';

    const { result } = renderHook(() => useCarbon('test-user-999'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.logActivity(
        'transport',
        'bus',
        10,
        'km',
        0.89,
        'New streak'
      );
    });

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      currentStreak: 1
    }));
  });

  it('catches and logs errors when updating streak fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCarbon('test-user-999'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Set toggle AFTER initial onSnapshot fetch completes so the write-time streak fetch fails
    failNextGetDoc = true;

    await act(async () => {
      await result.current.logActivity(
        'transport',
        'bus',
        10,
        'km',
        0.89,
        'Failing streak log'
      );
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error updating streak:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('logs errors when fetching streak for summary fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getDocShouldFail = true;

    const { result } = renderHook(() => useCarbon('test-user-999'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching streak for summary:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
