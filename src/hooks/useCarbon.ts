import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  FirestoreError
} from 'firebase/firestore';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { db } from '../services/firebase';
import { useAuth } from './useAuth';
import { queryClient } from './useQuery';
import { CarbonActivity as Activity, ActivityCategory, CarbonSummary, UserProfile } from '../types';
import { trackEvent } from '../utils/analytics';
import { sanitizeActivityInput, sanitizeString } from '../utils/sanitize';
import { rateLimits } from '../utils/rateLimiter';

/**
 * Custom hook for real-time carbon activity management.
 * Establishes Firestore onSnapshot listener for live updates.
 * Handles activity logging with input sanitization and rate limiting.
 * @param userId - Optional user ID override (uses auth user by default)
 * @returns Carbon activities, summary stats, and logging functions
 */
interface CarbonReturn {
  activities: Activity[];
  summary: CarbonSummary;
  loading: boolean;
  error: string | null;
  logActivity: (data: Omit<Activity, 'id' | 'createdAt'>) => Promise<string>;
  updateProfileSettings: (settingsOrCountry: Partial<UserProfile> | string, dietPreference?: string) => Promise<void>;
  seedDemoData: () => Promise<void>;
}

export const useCarbon = (userId?: string | null): CarbonReturn => {
  const { user: authUser } = useAuth();
  const user = authUser;
  const activeUserId = userId || user?.uid;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retrieve activities list from TanStack React Query cache
  const { data: activities = [] } = useTanStackQuery<Activity[], Error>({
    queryKey: ['activities', activeUserId],
    queryFn: () => queryClient.getQueryData<Activity[]>(['activities', activeUserId]) || [],
    enabled: !!activeUserId,
    staleTime: Infinity,
  });

  // Retrieve summary statistics from TanStack React Query cache
  const { data: summary = { todayKg: 0, weekKg: 0, monthKg: 0, streak: 0 } } = useTanStackQuery<CarbonSummary, Error>({
    queryKey: ['summary', activeUserId],
    queryFn: () => queryClient.getQueryData<CarbonSummary>(['summary', activeUserId]) || { todayKg: 0, weekKg: 0, monthKg: 0, streak: 0 },
    enabled: !!activeUserId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!activeUserId) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const startTimer = setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);

    // Get last 30 days of activities
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];

    const activitiesRef = collection(
      db, 
      'users', 
      activeUserId, 
      'activities'
    );
    
    const q = query(
      activitiesRef,
      where('date', '>=', dateString),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );

    // Real-time listener with error handling
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: false },
      async (snapshot) => {
        const acts: Activity[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<Activity, 'id'>
        }));
        
        // Fetch current streak from profile to include in summary
        let currentStreak = 0;
        try {
          const userRef = doc(db, 'users', activeUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            currentStreak = userSnap.data().currentStreak || 0;
          }
        } catch (e) {
          console.error('Error fetching streak for summary:', e);
        }

        const calculated = calculateSummary(acts);
        calculated.streak = currentStreak;

        // Synchronize real-time snapshot data into the React Query cache
        queryClient.setQueryData(['activities', activeUserId], acts);
        queryClient.setQueryData(['summary', activeUserId], calculated);

        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error('Firestore onSnapshot error:', err.code, err.message);
        
        // Handle specific errors
        if (err.code === 'permission-denied') {
          setError('Access denied. Please sign out and sign in again.');
        } else if (err.code === 'unavailable') {
          setError('You appear to be offline. Showing cached data.');
        } else {
          setError('Failed to load activities. Pull to refresh.');
        }
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or user change
    return () => {
      clearTimeout(startTimer);
      unsubscribe();
    };
  }, [activeUserId]);

  const logActivity = useCallback(async (
    firstArg: Omit<Activity, 'id' | 'createdAt'> | ActivityCategory,
    activityType?: string,
    quantity?: number,
    unit?: string,
    co2Kg?: number,
    geminiTip: string = ''
  ) => {
    const uid = activeUserId;
    if (!uid) throw new Error('Must be logged in to log activity');
    
    let activityData: Omit<Activity, 'id' | 'createdAt'>;
    if (typeof firstArg === 'object') {
      activityData = firstArg;
    } else {
      activityData = {
        category: firstArg,
        activityType: activityType!,
        quantity: quantity!,
        unit: unit!,
        co2Kg: co2Kg!,
        geminiTip: geminiTip,
        date: new Date().toISOString().split('T')[0]
      };
    }
    
    // Rate Limiting Check
    const limit = rateLimits.activityLog(uid);
    if (!limit.allowed) {
      throw new Error(
        `Too many requests. Try again in ${Math.ceil(limit.waitMs / 1000)}s`
      );
    }

    // Sanitize and validate activity input using utility
    const sanitized = sanitizeActivityInput({
      category: activityData.category,
      activityType: activityData.activityType,
      quantity: activityData.quantity,
      unit: activityData.unit,
      co2Kg: activityData.co2Kg,
      date: activityData.date
    });

    activityData = {
      ...activityData,
      ...sanitized,
      category: sanitized.category as ActivityCategory,
      geminiTip: sanitizeString(activityData.geminiTip)
    };
    
    const userActivitiesRef = collection(
      db,
      'users',
      uid,
      'activities'
    );

    const docRef = await addDoc(userActivitiesRef, {
      ...activityData,
      co2Kg: Math.round(activityData.co2Kg * 1000) / 1000,
      createdAt: serverTimestamp(),
      userId: uid
    });

    // Update streak
    await updateStreak(uid, activityData.date);
    
    return docRef.id;
  }, [activeUserId]);

  const updateProfileSettings = useCallback(async (
    settingsOrCountry: Partial<UserProfile> | string,
    dietPreference?: string
  ): Promise<void> => {
    const uid = activeUserId;
    if (!uid) throw new Error('User not authenticated.');
    const userRef = doc(db, 'users', uid);
    if (typeof settingsOrCountry === 'string') {
      await updateDoc(userRef, {
        country: settingsOrCountry,
        dietPreference: dietPreference,
      });
    } else {
      await updateDoc(userRef, settingsOrCountry);
    }
    await queryClient.invalidateQueries({ queryKey: ['profile', uid] });
  }, [activeUserId]);

  /**
   * Seeds demo activity data for first-time users.
   * Generates 30 days of realistic Bengaluru lifestyle data.
   * @returns Promise resolving when all demo data is written
   */
  const seedDemoData = async (): Promise<void> => {
    if (!user) throw new Error('Must be logged in to seed data');
    
    const today = new Date();
    const batchActivities: Omit<Activity, 'id' | 'createdAt'>[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      batchActivities.push({
        category: 'transport',
        activityType: 'car_petrol',
        quantity: isWeekend ? 25 : 15,
        unit: 'km',
        co2Kg: isWeekend ? 25 * 0.21 : 15 * 0.21,
        date: dateStr,
        geminiTip: 'Try metro for this route',
        userId: user.uid
      });

      const isVeg = Math.random() > 0.4;
      batchActivities.push({
        category: 'food',
        activityType: isVeg ? 'vegetarian_meal' : 'meat_meal',
        quantity: 1,
        unit: 'serving',
        co2Kg: isVeg ? 1.69 : 6.61,
        date: dateStr,
        geminiTip: isVeg ? 'Great veg choice!' : 'Try veg tomorrow',
        userId: user.uid
      });

      batchActivities.push({
        category: 'energy',
        activityType: 'electricity_kwh',
        quantity: isWeekend ? 8 : 3,
        unit: 'kWh',
        co2Kg: isWeekend ? 8 * 0.82 : 3 * 0.82,
        date: dateStr,
        geminiTip: 'Switch off AC at night',
        userId: user.uid
      });
    }

    for (const activity of batchActivities) {
      await logActivity(activity);
    }
  };

  return { activities, loading, error, summary, logActivity, updateProfileSettings, seedDemoData };
};

// Helper: calculate summary stats from activities array
function calculateSummary(activities: Activity[]): CarbonSummary {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const todayKg = activities
    .filter(a => a.date === today)
    .reduce((sum, a) => sum + a.co2Kg, 0);

  const weekKg = activities
    .filter(a => a.date >= weekAgoStr)
    .reduce((sum, a) => sum + a.co2Kg, 0);

  const monthKg = activities
    .reduce((sum, a) => sum + a.co2Kg, 0);

  return {
    todayKg: Math.round(todayKg * 100) / 100,
    weekKg: Math.round(weekKg * 100) / 100,
    monthKg: Math.round(monthKg * 100) / 100,
    streak: 0
  };
}

async function updateStreak(userId: string, date: string) {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const lastLogDate = data.lastLogDate;
      const todayStr = date;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newCurrentStreak = data.currentStreak || 0;
      let newLongestStreak = data.longestStreak || 0;

      if (lastLogDate === todayStr) {
        return;
      } else if (lastLogDate === yesterdayStr) {
        newCurrentStreak += 1;
      } else {
        newCurrentStreak = 1;
      }

      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }

      await updateDoc(userRef, {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastLogDate: todayStr
      });

      // Track streak update
      trackEvent.streakAchieved(newCurrentStreak);
    }
  } catch (err) {
    console.error('Error updating streak:', err);
  }
}
