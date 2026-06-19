/**
 * EcoTrace Global Constants
 * Centralizes all environmental factors, limits, and fallback configurations.
 */

export const SAFETY_LIMITS = {
  DAILY_CO2_LIMIT: 100, // kg CO2
  WEEKLY_GRID_LIMIT: 36.5, // kg CO2
  ANNUAL_TARGET_CO2: 4000, // kg CO2
};

export const EMISSION_FACTORS = {
  transport: {
    car_petrol: 0.21,      // kg CO2 per km
    car_diesel: 0.17,      // kg CO2 per km
    car_electric: 0.05,    // kg CO2 per km
    bus: 0.089,            // kg CO2 per km
    train: 0.041,          // kg CO2 per km
    flight: 0.255,         // kg CO2 per km
    bike_walk: 0,
  },
  food: {
    meat_meal: 6.61,       // kg CO2 per serving
    vegetarian_meal: 1.69,  // kg CO2 per serving
    vegan_meal: 1.05,      // kg CO2 per serving
    dairy: 3.2,            // kg CO2 per serving
  },
  energy: {
    electricity_kwh: 0.82, // kg CO2 per kWh
    lpg_kg: 2.98,          // kg CO2 per kg
    ac_hours: 1.25,        // kg CO2 per hour
  },
  shopping: {
    clothing: 10.0,        // kg CO2 per item
    electronics: 70.0,     // kg CO2 per item
    plastic_item: 6.0,     // kg CO2 per item
  }
};

export const INDIA_DAILY_AVG_CO2 = 5.21; // kg CO2/day
export const GLOBAL_DAILY_AVG_CO2 = 10.96; // kg CO2/day

export const DEFAULT_CHALLENGES = [
  {
    title: 'Metro Over Cab Today',
    description: 'Take Namma Metro for a trip over 3km instead of Ola/Uber',
    savingKg: 3.2,
    category: 'transport' as const,
    difficulty: 'easy' as const,
  },
  {
    title: 'Skip Meat at Lunch',
    description: 'Choose a vegetarian meal at your office canteen or nearby restaurant',
    savingKg: 2.5,
    category: 'food' as const,
    difficulty: 'easy' as const,
  },
  {
    title: 'AC Eco Mode',
    description: 'Set your AC to 25°C or use fan ventilation for cooling tonight',
    savingKg: 3.75,
    category: 'energy' as const,
    difficulty: 'medium' as const,
  }
];

export const STATIC_FALLBACK_PLAN = {
  ecoScore: 65,
  scoreLabel: 'On Track' as const,
  weeklyTarget: 32.5,
  topInsight: 'Focus on transport — it is typically 40% of urban Indian carbon footprints.',
  actions: [
    { day: 1, action: 'Take metro instead of cab', category: 'transport' as const, savingKg: 3.2, difficulty: 'easy' as const, localContext: 'Bengaluru Namma Metro covers most IT corridors' },
    { day: 2, action: 'Switch to vegetarian lunch', category: 'food' as const, savingKg: 5.0, difficulty: 'easy' as const, localContext: 'Most Bengaluru canteens have excellent veg options' },
    { day: 3, action: 'Set AC temperature to 24°C', category: 'energy' as const, savingKg: 1.5, difficulty: 'easy' as const, localContext: 'Every degree above 20 saves ~6% energy' },
    { day: 4, action: 'Walk to local shop for groceries', category: 'transport' as const, savingKg: 1.2, difficulty: 'easy' as const, localContext: 'Bengaluru local layouts are walkable' },
    { day: 5, action: 'Choose reusable bag over plastic bag', category: 'shopping' as const, savingKg: 0.8, difficulty: 'easy' as const, localContext: 'Plastic bans are active in Karnataka' },
    { day: 6, action: 'Turn off power strips on sleep', category: 'energy' as const, savingKg: 0.9, difficulty: 'easy' as const, localContext: 'Vampire power draws 10W continuously' },
    { day: 7, action: 'Plan a completely vegan day', category: 'food' as const, savingKg: 6.5, difficulty: 'medium' as const, localContext: 'Traditional South Indian food has many vegan options' }
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
};
