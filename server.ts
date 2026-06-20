import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { 
  calculateTransportCO2, 
  calculateFoodCO2, 
  calculateEnergyCO2, 
  calculateShoppingCO2 
} from './src/utils/carbonCalc.js';
import { CarbonActivity } from './src/types/index.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK to prevent startup crashes if GEMINI_API_KEY is missing
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is not defined.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Baseline carbon calculator (Onboarding Flow)
app.post('/api/gemini/baseline', async (req, res) => {
  const { country, diet, transport, energySource } = req.body;
  if (!country) {
    return res.status(400).json({ error: 'Missing country in request' });
  }

  const prompt = `
  You are an expert carbon footprint assessment model. The user is onboarding to "EcoTrace".
  Profile of the user:
  - Country: ${country}
  - Primary Diet: ${diet}
  - Primary Transport method: ${transport}
  - Home Energy Source: ${energySource}

  Task:
  1. Calculate an estimated baseline carbon footprint for this individual in kg of CO2 per month.
  2. Give 1 specific, high-impact suggestion targeting their highest lifestyle emission source.
  3. Keep the baseline value realistic (usually ranges between 200kg and 1500kg CO2 per month depending on country and lifestyle).

  Return exactly a JSON object matching this schema. Do not include markdown tags outside the JSON:
  {
    "baselineScore": number,
    "suggestion": string,
    "highestImpactSource": "transport" | "food" | "energy"
  }
  `;

  try {
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.text || '{}';
    const parsed = JSON.parse(responseText.trim());
    res.json(parsed);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini baseline calculation error, using fallback:', errorMsg);
    
    // Pure fallback based on standard calculations
    let baseScore = 400; // default baseline average in kg CO2/month
    if (country === 'USA') baseScore = 1350;
    else if (country === 'India') baseScore = 150;
    else if (country === 'Germany') baseScore = 750;

    if (diet === 'heavy_meat') baseScore += 200;
    if (transport === 'petrol') baseScore += 300;
    if (energySource === 'grid') baseScore += 250;

    res.json({
      baselineScore: Number(baseScore.toFixed(0)),
      suggestion: 'Consolidating private car journeys and adopting carbon-friendly diets can immediately lower your monthly carbon footprint by over 15%.',
      highestImpactSource: transport === 'petrol' || transport === 'diesel' ? 'transport' : 'energy'
    });
  }
});

// 3. Daily activity carbon logger api (Calculate CO2, alternatives, and insights)
app.post('/api/gemini/calculate', async (req, res) => {
  const { category, details, userProfile } = req.body;
  if (!category || !details) {
    return res.status(400).json({ error: 'Category and details are required' });
  }

  // Pre-calculate exact CO2 using pure TS formulas for mathematical accuracy
  let exactCO2 = 0;
  const type = details.type || details.activityType || '';
  const qty = Number(details.quantity || details.distanceKm || details.servings || 0);

  if (category === 'transport') {
    exactCO2 = calculateTransportCO2(type, qty);
  } else if (category === 'food') {
    exactCO2 = calculateFoodCO2(type, qty);
  } else if (category === 'energy') {
    exactCO2 = calculateEnergyCO2(type, qty);
  } else if (category === 'shopping') {
    exactCO2 = calculateShoppingCO2(type, qty);
  }

  const prompt = `
  The user logged a "${category}" activity on EcoTrace.
  Activity Details: ${JSON.stringify(details)}
  Exact mathematically calculated CO2 emission: ${exactCO2} kg.
  User Profile Context: Country ${userProfile?.country || 'Global'}, Diet ${userProfile?.lifestyle?.diet || 'unspecified'}.

  Task:
  1. Generate 1 specific, highly practical alternative action they could have taken or can take next time to avoid some or all of this carbon.
  2. Provide a 1-sentence highly motivational and context-aware eco-insight about this action.
  
  Return exactly a JSON object matching this schema:
  {
    "co2_kg": number,
    "alternative": string,
    "insight": string
  }
  Fill "co2_kg" with exactly the number ${exactCO2}.
  `;

  try {
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.text || '{}';
    const parsed = JSON.parse(responseText.trim());
    // Enforce our exact calculation for absolute mathematical trust
    parsed.co2_kg = exactCO2;
    res.json(parsed);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini calculation error, using fallback:', errorMsg);
    
    // Robust local fallback
    let alternative = 'Consider sharing journeys or choosing carbon offset certified items.';
    let insight = `This activity emitted ${exactCO2}kg of CO2. Reducing similar activities makes a major collective difference over time.`;

    if (category === 'transport') {
      alternative = 'Switch to public transport or look into electric car alternatives for longer commutes.';
      insight = `By leaving the petrol car behind and choosing buses, trains, or active travel, you save around 75% of transit footprint.`;
    } else if (category === 'food') {
      alternative = 'For your next meal, enjoy a nutrient-rich vegetarian or plant-based dish.';
      insight = `Choosing vegetarian diets reduces meal emissions by 80% compared to beef or sheep protein options.`;
    }

    res.json({
      co2_kg: exactCO2,
      alternative,
      insight
    });
  }
});

// 4. streaming chat assistant (Ask EcoTrace anything)
app.post('/api/gemini/chat', async (req, res) => {
  const { messages, userProfile } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Take the last 8 messages for context
  const history = messages.slice(-8);
  const userPrompt = history[history.length - 1]?.text;

  const systemInstructions = `
  You are "EcoTrace Assistant", a supportive, highly knowledgeable AI sustainable living advisor.
  The user is logged in. Their profile context:
  - Country: ${userProfile?.country || 'Global'}
  - Current Daily Streak: ${userProfile?.streak || 0} days
  - Lifestyle diet: ${userProfile?.lifestyle?.diet || 'vegetarian'}
  - Home energy: ${userProfile?.lifestyle?.energySource || 'grid'}
  - Total CO2 Saved so far: ${userProfile?.totalSavedKg || 0} kg CO2 (roughly ${((userProfile?.totalSavedKg || 0) / 22).toFixed(1)} trees equivalent).

  Style:
  - Objective, encouraging, and informative
  - Use markdown formatting for bullet points and lists
  - Suggest small, practical steps instead of abstract changes
  - Limit response length to around 150-200 words
  - Do NOT invent data or use system codes. Focus strictly on custom tips.
  `;

  try {
    const ai = getGeminiClient();
    
    // Create direct content response. To support seamless UX without full socket streaming overhead, we generate text with structured instruction.
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `System context: ${systemInstructions}\n\nUser query: ${userPrompt}` }] }
      ],
    });

    const text = result.text || '';
    res.json({ text });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini chat error, using fallback:', errorMsg);
    
    // Friendly, supportive local recommendation if Gemini is unavailable
    res.json({
      text: `Hi there! I am the EcoTrace Assistant. I'm currently running in offline fallback mode because the backend Gemini service reported an error: "${errorMsg}".\n\nYour total carbon footprint logged this week is ${((userProfile?.totalSavedKg || 0)).toFixed(1)}kg CO2. Here are some tips to reduce your emissions:\n- Consolidate driving errands to save transport carbon.\n- Try a plant-based meal once a week.\n- Switch off appliances at the wall to prevent vampire energy draw.`
    });
  }
});

// 5. Proactive insights generator
app.post('/api/gemini/insights', async (req, res) => {
  const { userProfile, weeklyEmissionsLog } = req.body;
  
  const prompt = `
  You are the EcoTrace Proactive Analytics Engine.
  The user's profile:
  - Country: ${userProfile?.country || 'India'}
  - Current diet: ${userProfile?.lifestyle?.diet || 'vegetarian'}
  - Total Saved: ${userProfile?.totalSavedKg || 0} kg CO2
  
  Recent weekly emissions logs logged by user:
  ${JSON.stringify(weeklyEmissionsLog || [])}

  Task:
  1. Generate a personalized, highly specific proactive weekly tip (max 2 sentences).
  2. Create a personalized "30-day green challenge" title and short description custom-fitted to their profile to reduce CO2 emissions.
  
  Return exactly a JSON object matching this schema:
  {
    "weeklyTip": string,
    "challengeTitle": string,
    "challengeDescription": string,
    "targetSavingKg": number
  }
  `;

  try {
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.text || '{}';
    const parsed = JSON.parse(responseText.trim());
    res.json(parsed);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini insights error, using fallback:', errorMsg);
    res.json({
      weeklyTip: "You saved an estimated 4.2kg of CO2 this week! Switching just 2 hot water cycles to cold wash laundry could save an extra 1.5kg of carbon.",
      challengeTitle: "Green Grid Champion",
      challengeDescription: "Commit to powering down all non-essential chargers and switching home appliances to standby-saver mode for the next 30 days.",
      targetSavingKg: 12
    });
  }
});

// 6. 7-Day eco action plan proxy
app.post('/api/gemini/plan', async (req, res) => {
  const { activities, liveData, userProfile } = req.body;
  if (!activities || !liveData || !userProfile) {
    return res.status(400).json({ error: 'Missing activities, liveData, or userProfile in request' });
  }

  // Calculate category breakdown
  const byCategory = activities.reduce(
    (acc: Record<string, number>, a: CarbonActivity) => {
      acc[a.category] = (acc[a.category] || 0) + a.co2Kg;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalKg = Object.values(byCategory).reduce((s: number, v: number) => s + v, 0);

  const prompt = `
  You are an expert carbon footprint advisor with deep knowledge of Indian lifestyle patterns.
  
  USER PROFILE:
  - Location: Bengaluru, India
  - Diet: ${userProfile.dietPreference || 'vegetarian'}
  - Last 30 days total: ${totalKg.toFixed(2)}kg CO2
  
  EMISSION BREAKDOWN:
  ${Object.entries(byCategory)
    .sort(([,a],[,b]) => b - a)
    .map(([cat, kg]) => 
      `- ${cat}: ${kg.toFixed(2)}kg (${totalKg > 0 ? ((kg/totalKg)*100).toFixed(1) : 0}% of total)`)
    .join('\n')}
  
  REAL-TIME CONTEXT:
  - Current grid intensity: ${liveData.gridIntensity} kgCO2/kWh
    (${liveData.gridIndex} — ${
      liveData.gridIndex === 'high' 
      ? 'peak hours, coal heavy' 
      : 'off-peak, more renewables'})
  - Bengaluru weather: ${liveData.weather?.temp || 27}°C, ${liveData.weather?.condition || 'clear'}
  - India national average: ${liveData.nationalDailyAvgKg}kg/day
  - User vs average: ${
      totalKg/30 < liveData.nationalDailyAvgKg 
      ? `${(((liveData.nationalDailyAvgKg - totalKg/30) / liveData.nationalDailyAvgKg)*100).toFixed(1)}% BETTER`
      : `${(((totalKg/30 - liveData.nationalDailyAvgKg) / liveData.nationalDailyAvgKg)*100).toFixed(1)}% WORSE`
    } than national average
  
  ECOSCOPE ANALYSIS:
  Using formula: max(0, 100 - (annualKg / 4000) * 100)
  User annual projection: ${(totalKg/30*365).toFixed(0)}kg
  EcoScore: ${Math.max(0, Math.round(100 - ((totalKg/30*365) / 4000) * 100))}/100
  
  Generate a PERSONALIZED 7-DAY ECO ACTION PLAN.
  Return a JSON object conforming exactly to this schema:
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
  }
  `;

  try {
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.text || '{}';
    const parsed = JSON.parse(responseText.trim());
    res.json(parsed);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini plan generation error, using fallback:', errorMsg);
    
    // Fallback static plan
    res.json({
      ecoScore: 65,
      scoreLabel: 'On Track',
      weeklyTarget: 32.5,
      topInsight: 'Focus on transport — it is typically 40% of urban Indian carbon footprints.',
      actions: [
        { day: 1, action: 'Take metro instead of cab', category: 'transport', savingKg: 3.2, difficulty: 'easy', localContext: 'Bengaluru Namma Metro covers most IT corridors' },
        { day: 2, action: 'Switch to vegetarian lunch', category: 'food', savingKg: 5.0, difficulty: 'easy', localContext: 'Most Bengaluru canteens have excellent veg options' },
        { day: 3, action: 'Set AC temperature to 24°C', category: 'energy', savingKg: 1.5, difficulty: 'easy', localContext: 'Every degree above 20 saves ~6% energy' },
        { day: 4, action: 'Walk to local shop for groceries', category: 'transport', savingKg: 1.2, difficulty: 'easy', localContext: 'Bengaluru local layouts are walkable' },
        { day: 5, action: 'Choose reusable bag over plastic bag', category: 'shopping', savingKg: 0.8, difficulty: 'easy', localContext: 'Plastic bans are active in Karnataka' },
        { day: 6, action: 'Turn off power strips on sleep', category: 'energy', savingKg: 0.9, difficulty: 'easy', localContext: 'Vampire power draws 10W continuously' },
        { day: 7, action: 'Plan a completely vegan day', category: 'food', savingKg: 6.5, difficulty: 'medium', localContext: 'Traditional South Indian food has many vegan options' }
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
  }
});

// 7. Daily challenge proxy
app.post('/api/gemini/challenge', async (req, res) => {
  const { today } = req.body;
  const dayName = new Date().toLocaleDateString('en-IN', { weekday: 'long' });

  const prompt = `
  Generate ONE eco challenge for a Bengaluru resident for ${dayName}.
  Return a JSON object conforming exactly to this schema:
  {
    "title": "short action title",
    "description": "specific how-to for Bengaluru",
    "savingKg": number,
    "category": "transport" | "food" | "energy" | "shopping",
    "difficulty": "easy" | "medium" | "hard",
    "date": "${today || new Date().toISOString().split('T')[0]}"
  }
  Make it specific, achievable today, and India-relevant.
  `;

  try {
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.text || '{}';
    const parsed = JSON.parse(responseText.trim());
    res.json(parsed);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini challenge generation error, using fallback:', errorMsg);

    // Dynamic local fallback
    res.json({
      title: 'Green Commuter Sprint',
      description: 'Avoid private auto/cabs today; take the Namma Metro or BMTC bus for all travel.',
      savingKg: 4.2,
      category: 'transport',
      difficulty: 'easy',
      date: today || new Date().toISOString().split('T')[0]
    });
  }
});

// --- Vite setup for Frontend assets integration ---
async function initializeServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Server on 0.0.0.0:3000
  app.listen(PORT, '0.0.0.0', () => {
    // Server started — see Firebase Hosting logs
  });
}

initializeServer();
