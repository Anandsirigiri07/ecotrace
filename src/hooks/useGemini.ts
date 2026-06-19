import { useState } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Activity, ChatMessage, UserProfile, EcoPlan, ActivityCategory } from '../types';
import { useAuth } from './useAuth';
import { rateLimits } from '../utils/rateLimiter';

interface LiveData {
  gridIntensity: number;
  gridIndex: string;
  weather: {
    temp: number;
    condition: string;
    tip: string;
    isGoodForCycling: boolean;
  } | null;
  nationalDailyAvgKg: number;
  lastUpdated: Date;
}

const getEcoAdvisorPlan = async (
  activities: Activity[],
  liveData: LiveData,
  userProfile: UserProfile
): Promise<EcoPlan> => {
  const response = await fetch('/api/gemini/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ activities, liveData, userProfile }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${response.status}`);
  }

  return response.json();
};

const getCachedOrFreshPlan = async (
  userId: string,
  activities: Activity[],
  liveData: LiveData,
  userProfile: UserProfile
) => {
  const cacheRef = doc(db, 'users', userId, 'cache', 'ecoplan');
  
  const lastActivityTime = activities[0]?.createdAt 
    ? (activities[0].createdAt instanceof Timestamp 
        ? activities[0].createdAt.toMillis() 
        : new Date(activities[0].createdAt as string | number | Date).getTime())
    : 0;
    
  const cacheSnap = await getDoc(cacheRef);
  
  if (cacheSnap.exists()) {
    const cached = cacheSnap.data();
    const generatedAtMillis = cached.generatedAt instanceof Timestamp 
      ? cached.generatedAt.toMillis() 
      : new Date(cached.generatedAt as string | number | Date).getTime();
    const cacheAge = Date.now() - generatedAtMillis;
    const sixHours = 6 * 60 * 60 * 1000;
    
    if (cacheAge < sixHours && 
        cached.lastActivityTime === lastActivityTime) {
      console.info('Using Firestore cached eco plan');
      return cached.plan;
    }
  }
  
  const freshPlan = await getEcoAdvisorPlan(
    activities, liveData, userProfile
  );
  
  await setDoc(cacheRef, {
    plan: freshPlan,
    generatedAt: Timestamp.now(),
    lastActivityTime,
    activitiesHash: activities.length
  });
  
  return freshPlan;
};

const getStaticFallbackPlan = (activities: Activity[]): EcoPlan => ({
  ecoScore: 65,
  scoreLabel: 'On Track',
  weeklyTarget: 32.5,
  topInsight: 'Focus on transport — it is typically 40% of urban Indian carbon footprints.',
  actions: [
    { day: 1, action: 'Take metro instead of cab', category: 'transport' as ActivityCategory, savingKg: 3.2, difficulty: 'easy', localContext: 'Bengaluru Namma Metro covers most IT corridors' },
    { day: 2, action: 'Switch to vegetarian lunch', category: 'food' as ActivityCategory, savingKg: 5.0, difficulty: 'easy', localContext: 'Most Bengaluru canteens have excellent veg options' },
    { day: 3, action: 'Set AC temperature to 24°C', category: 'energy' as ActivityCategory, savingKg: 1.5, difficulty: 'easy', localContext: 'Every degree above 20 saves ~6% energy' },
    { day: 4, action: 'Walk to local shop for groceries', category: 'transport' as ActivityCategory, savingKg: 1.2, difficulty: 'easy', localContext: 'Bengaluru local layouts are walkable' },
    { day: 5, action: 'Choose reusable bag over plastic bag', category: 'shopping' as ActivityCategory, savingKg: 0.8, difficulty: 'easy', localContext: 'Plastic bans are active in Karnataka' },
    { day: 6, action: 'Turn off power strips on sleep', category: 'energy' as ActivityCategory, savingKg: 0.9, difficulty: 'easy', localContext: 'Vampire power draws 10W continuously' },
    { day: 7, action: 'Plan a completely vegan day', category: 'food' as ActivityCategory, savingKg: 6.5, difficulty: 'medium', localContext: 'Traditional South Indian food has many vegan options' }
  ],
  quickWins: [
    { title: 'LED bulb upgrade', impact: '5 kg CO2 saved per month', howTo: 'Replace old incandescent lights' },
    { title: 'Cold laundry wash', impact: '8 kg CO2 saved per month', howTo: 'Run washing machine on cold settings' },
    { title: 'Unplug chargers', impact: '2 kg CO2 saved per month', howTo: 'Switch off charger switches when not in use' }
  ],
  monthlyChallenge: {
    title: 'Namma Cycle commuter',
    description: 'Cycle to work/study for 10 commutes this month',
    targetReductionKg: 20,
    reward: 'Bengaluru Pedal Star'
  }
});

export const useGemini = () => {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState<EcoPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const generatePlan = async (
    userId: string,
    activities: Activity[],
    liveData: LiveData,
    userProfile: UserProfile
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCachedOrFreshPlan(
        userId, activities, liveData, userProfile
      );
      setPlan(result);
    } catch (err: unknown) {
      console.error('Failed to generate plan:', err);
      setPlan(getStaticFallbackPlan(activities));
      setError('Using offline eco tips (AI unavailable)');
    } finally {
      setLoading(false);
    }
  };

  const streamChat = async (
    message: string,
    history: ChatMessage[],
    context: { activities: Activity[], liveData: LiveData },
    onChunk: (text: string) => void
  ) => {
    const uid = user?.uid || 'anonymous';
    const limit = rateLimits.geminiCall(uid);
    if (!limit.allowed) {
      throw new Error(
        `AI limit reached. Wait ${
          Math.ceil(limit.waitMs / 60000)
        } min`
      );
    }

    setIsStreaming(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: history.map(h => ({
            role: h.role,
            text: h.content
          })),
          userProfile: {
            country: profile?.country || 'India',
            streak: profile?.currentStreak || 0,
            lifestyle: {
              diet: profile?.dietPreference || 'vegetarian',
              energySource: 'grid',
            },
            totalSavedKg: 0
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';

      const chars = Array.from(text);
      let current = '';
      const chunkSize = Math.max(1, Math.floor(chars.length / 50));
      let index = 0;

      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (index >= chars.length) {
            clearInterval(interval);
            resolve();
            return;
          }
          const nextChunk = chars.slice(index, index + chunkSize).join('');
          current += nextChunk;
          index += chunkSize;
          onChunk(nextChunk);
        }, 15);
      });
    } catch (err: unknown) {
      console.error('Stream chat error:', err);
      setError('Streaming chat failed. Showing local suggestion.');
      onChunk('Oops! I had trouble connecting to the Gemini service. Here is a helpful fallback suggestion:\n- Switch to active transit or carpooling for commutes.\n- Choose a vegetarian meal once a week.\n- Switch off energy-hungry appliances when done.');
    } finally {
      setIsStreaming(false);
    }
  };

  const getInstantTip = async (
    category: string,
    activityType: string,
    quantity: number,
    unit: string,
    todayTotalCO2: number,
    userProfile?: any
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          details: {
            type: activityType,
            activityType,
            quantity,
            unit
          },
          userProfile: userProfile ? {
            country: userProfile.country,
            lifestyle: {
              diet: userProfile.dietPreference
            }
          } : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      return `${data.alternative} ${data.insight}`;
    } catch (err: unknown) {
      console.error('Gemini calculation error:', err);
      setError('AI is temporarily unavailable, showing local tip instead.');
      return getLocalFallbackTip(activityType, quantity, unit, todayTotalCO2);
    } finally {
      setLoading(false);
    }
  };

  const getLocalFallbackTip = (activityType: string, quantity: number, unit: string, todayTotal: number): string => {
    if (activityType.includes('car')) {
      return 'Consider carpooling or grouping your errands to reduce total distance. Switching to electric or active transit saves major emissions!';
    }
    if (activityType.includes('meat')) {
      return 'Replacing meat with vegetarian protein even once a week can reduce your food footprint by over 15%. Vegetarian foods are much gentler on the planet!';
    }
    if (activityType.includes('electricity') || activityType.includes('ac')) {
      return 'Setting your AC just 1°C higher or utilizing natural ventilation can save up to 10% on your energy consumption.';
    }
    if (activityType.includes('plastic')) {
      return 'Carrying a reusable bag and steel water bottle blocks landfill waste and saves carbon spent on making disposable plastics.';
    }
    return `Your activity logged (${quantity} ${unit}) emitted carbon. Try tracking daily to discover habits you can tweak to stay under the 36.5kg weekly grid limit!`;
  };

  const isAIConfigured = true;

  return { 
    plan, 
    loading, 
    error, 
    isStreaming, 
    generatePlan, 
    streamChat,
    getInstantTip,
    isAIConfigured
  };
};

export default useGemini;
