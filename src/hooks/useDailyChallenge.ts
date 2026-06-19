import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { DEFAULT_CHALLENGES } from '../constants';
import { useQuery } from './useQuery';

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

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
 * one via the Gemini API, and provides a local fallback array if the API is offline.
 * 
 * @param userId The authenticated user's ID
 * @returns {challenge, loading} The active daily challenge and loading state.
 */
export const useDailyChallenge = (userId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: challenge, loading } = useQuery<DailyChallenge | null>(
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

        // Generate fresh with Gemini
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
        if (!apiKey) {
          throw new Error('API key missing');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-pro',
          safetySettings
        });

        const dayName = new Date().toLocaleDateString(
          'en-IN', { weekday: 'long' }
        );

        const result = await model.generateContent(`
          Generate ONE eco challenge for a Bengaluru
          resident for ${dayName}.
          Return ONLY valid JSON, no markdown fences:
          {
            "title": "short action title",
            "description": "specific how-to for Bengaluru",
            "savingKg": 0.0,
            "category": "transport|food|energy|shopping",
            "difficulty": "easy|medium|hard",
            "date": "${today}"
          }
          Make it specific, achievable today,
          and India-relevant.
        `);

        const text = result.response.text();
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean) as DailyChallenge;

        // Cache in Firestore for today
        await setDoc(ref, parsed);
        return parsed;
      } catch {
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

  return { challenge, loading };
};

export default useDailyChallenge;
