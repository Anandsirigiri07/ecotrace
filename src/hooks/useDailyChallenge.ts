import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DEFAULT_CHALLENGES } from '../constants';
import { useQuery } from './useQuery';

export interface DailyChallenge {
  title: string;
  description: string;
  savingKg: number;
  category: 'transport' | 'food' | 'energy' | 'shopping';
  difficulty: 'easy' | 'medium' | 'hard';
  date: string;
}

/**
 * Custom hook to manage and fetch the personalized daily eco-challenge using a query cache.
 * Attempts to retrieve a cached challenge from Firestore, falls back to generating a fresh 
 * one via the backend Gemini proxy API, and provides a local fallback array if the API is offline.
 * 
 * @param userId The authenticated user's ID
 * @returns {challenge, loading} The active daily challenge and loading state.
 */
export const useDailyChallenge = (userId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: challenge, loading, error, refetch } = useQuery<DailyChallenge | null>(
    `challenge-${userId}-${today}`,
    async () => {
      if (!userId) return null;
      try {
        // Check Firestore cache first
        const ref = doc(
          db, 'users', userId, 'cache', `challenge-${today}`
        );
        const snap = await getDoc(ref);

        if (snap.exists()) {
          return snap.data() as DailyChallenge;
        }

        // Generate fresh with Gemini via backend proxy
        const response = await fetch('/api/gemini/challenge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ today }),
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const parsed = await response.json() as DailyChallenge;

        // Cache in Firestore for today
        await setDoc(ref, parsed);
        return parsed;
      } catch (err) {
        console.warn('Failed to load challenge from Gemini proxy, using fallback:', err);
        // Fallback challenges mapped from centralized constants
        const index = new Date().getDate() % DEFAULT_CHALLENGES.length;
        const selected = DEFAULT_CHALLENGES[index];
        const fallback: DailyChallenge = {
          title: selected.title,
          description: selected.description,
          savingKg: selected.savingKg,
          category: selected.category,
          difficulty: selected.difficulty,
          date: today
        };
        return fallback;
      }
    },
    { staleTime: 86400000 } // Keep for 24 hours
  );

  return { challenge, loading, error, refetch };
};

export default useDailyChallenge;
