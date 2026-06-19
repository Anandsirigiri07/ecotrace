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
  updateDoc,
  getDoc,
  Timestamp,
  FirestoreError
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { Activity, CarbonSummary, ActivityCategory } from '../types';
import { trackEvent } from '../utils/analytics';

export const useCarbon = (userId?: string | null) => {
  const { user: authUser } = useAuth();
  const user = authUser;
  const activeUserId = userId || user?.uid;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CarbonSummary>({
    todayKg: 0,
    weekKg: 0,
    monthKg: 0,
    streak: 0
  });

  useEffect(() => {
    if (!activeUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

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
        
        setActivities(acts);
        
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
        setSummary(calculated);
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
    return () => unsubscribe();
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
    
    // Sanitize input
    if (activityData.co2Kg < 0) {
      throw new Error('CO2 value cannot be negative');
    }
    if (activityData.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    
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

  const updateProfileSettings = useCallback(async (country: string, dietPreference: string) => {
    const uid = activeUserId;
    if (!uid) throw new Error('User not authenticated.');
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      country,
      dietPreference,
    });
  }, [activeUserId]);

  return { activities, loading, error, summary, logActivity, updateProfileSettings };
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
