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

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK to prevent startup crashes if GEMINI_API_KEY is missing
let aiInstance: any = null;
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
  } catch (error: any) {
    console.error('Gemini baseline calculation error, using fallback:', error.message);
    
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
  } catch (error: any) {
    console.error('Gemini calculation error, using fallback:', error.message);
    
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
  } catch (error: any) {
    console.error('Gemini chat error, using fallback:', error.message);
    
    // Friendly, supportive local recommendation if Gemini is unavailable
    res.json({
      text: `Hi there! I am the EcoTrace Assistant. I'm currently running in offline fallback mode because the backend Gemini service reported an error: "${error.message}".\n\nYour total carbon footprint logged this week is ${((userProfile?.totalSavedKg || 0)).toFixed(1)}kg CO2. Here are some tips to reduce your emissions:\n- Consolidate driving errands to save transport carbon.\n- Try a plant-based meal once a week.\n- Switch off appliances at the wall to prevent vampire energy draw.`
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
  } catch (error: any) {
    console.error('Gemini insights error, using fallback:', error.message);
    res.json({
      weeklyTip: "You saved an estimated 4.2kg of CO2 this week! Switching just 2 hot water cycles to cold wash laundry could save an extra 1.5kg of carbon.",
      challengeTitle: "Green Grid Champion",
      challengeDescription: "Commit to powering down all non-essential chargers and switching home appliances to standby-saver mode for the next 30 days.",
      targetSavingKg: 12
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
    console.log(`[EcoTrace] Server is active and listening on http://localhost:${PORT}`);
  });
}

initializeServer();
