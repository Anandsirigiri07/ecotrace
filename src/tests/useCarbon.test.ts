import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCarbon } from '../hooks/useCarbon';
import { collection, addDoc, getDoc, updateDoc } from 'firebase/firestore';

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

// Mock firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-activity-id' }),
  onSnapshot: vi.fn((q, arg2, arg3) => {
    const callback = typeof arg2 === 'function' ? arg2 : arg3;
    if (callback) {
      // Run callback in next tick to avoid React act warning
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
    return () => {}; // unsubscribe function
  }),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'timestamp'),
  doc: vi.fn().mockReturnValue({}),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      currentStreak: 2,
      longestStreak: 5,
      lastLogDate: '2026-06-18'
    })
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
  });

  it('subscribes to activities on snapshot and calculates initial summary', async () => {
    const { result } = renderHook(() => useCarbon('test-user-999'));

    // Loading should resolve to false after onSnapshot callback runs
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities.length).toBe(1);
    expect(result.current.activities[0].id).toBe('act-1');
    expect(result.current.summary.todayKg).toBe(3.15);
  });

  it('saves new activities and triggers streak updates', async () => {
    const { result } = renderHook(() => useCarbon('test-user-999'));

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
    expect(updateDoc).toHaveBeenCalled(); // streak updated
  });

  it('updates settings in user profile', async () => {
    const { result } = renderHook(() => useCarbon('test-user-999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfileSettings('USA', 'Vegan');
    });

    expect(updateDoc).toHaveBeenCalled();
  });
});
