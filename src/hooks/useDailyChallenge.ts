import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface DailyChallenge {
  title: string;
  description: string;
  savingKg: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  date: string;
}

export const useDailyChallenge = (userId: string) => {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const fetchChallenge = async () => {
      try {
        // Check Firestore cache first
        const ref = doc(
          db, 'users', userId, 'cache', `challenge-${today}`
        );
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setChallenge(snap.data() as DailyChallenge);
          setLoading(false);
          return;
        }

        // Generate fresh with Gemini
        const genAI = new GoogleGenerativeAI(
          import.meta.env.VITE_GEMINI_API_KEY
        );
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-pro'
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
        setChallenge(parsed);
      } catch {
        // Fallback challenges
        const fallbacks: DailyChallenge[] = [
          {
            title: 'Metro Over Cab Today',
            description: 'Take Namma Metro for any trip over 3km instead of Ola/Uber',
            savingKg: 3.2,
            category: 'transport',
            difficulty: 'easy',
            date: today
          },
          {
            title: 'Skip Meat at Lunch',
            description: 'Choose a vegetarian meal at your office canteen or nearby restaurant',
            savingKg: 2.5,
            category: 'food',
            difficulty: 'easy',
            date: today
          },
          {
            title: 'AC at 26°C Challenge',
            description: 'Set your AC to 26°C instead of the usual 22-24°C for the whole day',
            savingKg: 1.8,
            category: 'energy',
            difficulty: 'medium',
            date: today
          },
          {
            title: 'No Single-Use Plastic',
            description: 'Carry your own water bottle and bag — refuse all plastic today',
            savingKg: 0.5,
            category: 'shopping',
            difficulty: 'easy',
            date: today
          },
          {
            title: 'Walk the Last Kilometer',
            description: 'Get off one stop early and walk the rest — great for Bengaluru weather',
            savingKg: 1.2,
            category: 'transport',
            difficulty: 'easy',
            date: today
          },
          {
            title: 'Cold Shower Challenge',
            description: 'Skip the geyser today — saves electricity and water heating energy',
            savingKg: 1.5,
            category: 'energy',
            difficulty: 'hard',
            date: today
          },
          {
            title: 'Cook at Home Tonight',
            description: 'Skip food delivery — home cooking has 60% lower carbon footprint',
            savingKg: 2.0,
            category: 'food',
            difficulty: 'medium',
            date: today
          }
        ];
        const fallback = fallbacks[new Date().getDay() % fallbacks.length];
        setChallenge(fallback);
      }
      setLoading(false);
    };

    fetchChallenge();
  }, [userId]);

  return { challenge, loading };
};
