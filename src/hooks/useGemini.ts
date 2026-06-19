import { useState } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Activity, ChatMessage, UserProfile, EcoPlan, ActivityCategory } from '../types';
import { useAuth } from './useAuth';
import { rateLimits } from '../utils/rateLimiter';
import { sanitizeGeminiPrompt } from '../utils/sanitize';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

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
) => {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-pro', // NOT flash
    safetySettings
  });

  // Calculate category breakdown
  const byCategory = activities.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.co2Kg;
    return acc;
  }, {} as Record<string, number>);

  const totalKg = Object.values(byCategory)
    .reduce((s, v) => s + v, 0);

  const prompt = `
You are an expert carbon footprint advisor with 
deep knowledge of Indian lifestyle patterns.

USER PROFILE:
- Location: Bengaluru, India
- Diet: ${userProfile.dietPreference}
- Last 30 days total: ${totalKg.toFixed(2)}kg CO2

EMISSION BREAKDOWN:
${Object.entries(byCategory)
  .sort(([,a],[,b]) => b - a)
  .map(([cat, kg]) => 
    `- ${cat}: ${kg.toFixed(2)}kg 
     (${totalKg > 0 ? ((kg/totalKg)*100).toFixed(1) : 0}% of total)`)
  .join('\n')}

REAL-TIME CONTEXT:
- Current grid intensity: ${liveData.gridIntensity} kgCO2/kWh
  (${liveData.gridIndex} — ${
    liveData.gridIndex === 'high' 
    ? 'peak hours, coal heavy' 
    : 'off-peak, more renewables'})
- Bengaluru weather: ${liveData.weather?.temp || 27}°C, 
  ${liveData.weather?.condition || 'clear'}
- India national average: ${liveData.nationalDailyAvgKg}kg/day
- User vs average: ${
    totalKg/30 < liveData.nationalDailyAvgKg 
    ? `${(((liveData.nationalDailyAvgKg - totalKg/30) / 
         liveData.nationalDailyAvgKg)*100).toFixed(1)}% BETTER`
    : `${(((totalKg/30 - liveData.nationalDailyAvgKg) / 
         liveData.nationalDailyAvgKg)*100).toFixed(1)}% WORSE`
  } than national average

ECOSCOPE ANALYSIS:
Using formula: max(0, 100 - (annualKg / 4000) * 100)
User annual projection: ${(totalKg/30*365).toFixed(0)}kg
EcoScore: ${Math.max(0, Math.round(100 - ((totalKg/30*365) / 4000) * 100))}/100

Generate a PERSONALIZED 7-DAY ECO ACTION PLAN:
Return ONLY valid JSON, no markdown tags (e.g. no \`\`\`json block, no \`\`\`), just the raw JSON object string:
{
  "ecoScore": number,
  "scoreLabel": "Carbon Hero" | "On Track" | "Needs Work" | "Critical",
  "weeklyTarget": number,
  "topInsight": "one powerful sentence about their data",
  "actions": [
    {
      "day": number,
      "action": "specific action for Bengaluru resident",
      "category": "transport" | "food" | "energy" | "shopping",
      "savingKg": number,
      "difficulty": "easy" | "medium" | "hard",
      "localContext": "India/Bengaluru specific detail"
    }
  ],
  "quickWins": [
    {
      "title": "string",
      "impact": "X kg CO2 saved per month",
      "howTo": "specific step for Bengaluru"
    }
  ],
  "monthlyChallenge": {
    "title": "string",
    "description": "string", 
    "targetReductionKg": number,
    "reward": "badge name if achieved"
  }
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Parse and validate JSON
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    throw new Error('Gemini returned invalid JSON');
  }
};

const getCachedOrFreshPlan = async (
  userId: string,
  activities: Activity[],
  liveData: LiveData,
  userProfile: UserProfile
) => {
  const cacheRef = doc(db, 'users', userId, 'cache', 'ecoplan');
  
  // Check if user has logged new activities since last cache
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
    
    // Use cache if less than 6 hours old AND 
    // no new activities since cache was made
    if (cacheAge < sixHours && 
        cached.lastActivityTime === lastActivityTime) {
      console.info('Using Firestore cached eco plan');
      return cached.plan;
    }
  }
  
  // Generate fresh plan
  const freshPlan = await getEcoAdvisorPlan(
    activities, liveData, userProfile
  );
  
  // Save to Firestore cache
  await setDoc(cacheRef, {
    plan: freshPlan,
    generatedAt: Timestamp.now(),
    lastActivityTime,
    activitiesHash: activities.length // simple change detector
  });
  
  return freshPlan;
};

// Static fallback (competitor has this too, we match it)
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
  const { user } = useAuth();
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

  // Streaming chat (they don't have this!)
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
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        safetySettings
      });
      
      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        generationConfig: { maxOutputTokens: 500 }
      });

      const sanitizedMsg = sanitizeGeminiPrompt(message);
      const result = await chat.sendMessageStream(sanitizedMsg);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        onChunk(text);
      }
    } catch (err: unknown) {
      console.error('Stream chat error:', err);
      setError('Streaming chat failed. Showing local suggestion.');
      onChunk('Oops! I had trouble connecting to the Gemini service. Here is a helpful fallback suggestion:\n- Switch to active transit or carpooling for commutes.\n- Choose a vegetarian meal once a week.\n- Switch off energy-hungry appliances when done.');
    } finally {
      setIsStreaming(false);
    }
  };

  // Get instant encouraging tip after logging activity
  const getInstantTip = async (
    category: string,
    activityType: string,
    quantity: number,
    unit: string,
    todayTotalCO2: number,
    userProfile?: unknown
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        safetySettings
      });
      const prompt = `The user just logged a "${category}" activity: ${activityType} (${quantity} ${unit}). Total logged CO2 emitted is ${todayTotalCO2} kg. Generate a 1-sentence specific encouraging eco-insight or alternative suggestion in the Indian/Bengaluru context.`;
      const sanitizedPrompt = sanitizeGeminiPrompt(prompt);
      const result = await model.generateContent(sanitizedPrompt);
      return result.response.text().trim();
    } catch (err: unknown) {
      console.error('Gemini calculation error:', err);
      setError('AI is temporarily unavailable, showing local tip instead.');
      return getLocalFallbackTip(activityType, quantity, unit, todayTotalCO2);
    } finally {
      setLoading(false);
    }
  };

  // Local static tips for fallbacks
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

  // Helper: check configuration
  const isAIConfigured = (import.meta.env.VITE_GEMINI_API_KEY || '').trim().length > 0;

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
