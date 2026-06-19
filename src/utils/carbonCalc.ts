import { EMISSION_FACTORS, INDIA_DAILY_AVG_CO2, GLOBAL_DAILY_AVG_CO2, SAFETY_LIMITS } from '../constants';

/**
 * Calculations result properties of the user score compared to averages.
 */
export interface EcoScore {
  score: number;
  label: 'Carbon Hero' | 'On Track' | 'Needs Work' | 'Critical';
  color: string;
  ringColor: string;
  message: string;
  vsIndia: string;
  vsGlobal: string;
}

/**
 * Calculates total carbon emissions from transportation activities.
 * 
 * @param type The type of transport used (e.g. car_petrol, flight, bus, etc.)
 * @param distanceKm The total distance traveled in kilometers.
 * @returns The calculated CO2 emissions in kilograms (defaults to 0 for negative/zero distance).
 */
export function calculateTransportCO2(type: string, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  
  const factors = EMISSION_FACTORS.transport;
  switch (type) {
    case 'car_petrol':
      return distanceKm * factors.car_petrol;
    case 'car_diesel':
      return distanceKm * factors.car_diesel;
    case 'car_electric':
      return distanceKm * factors.car_electric;
    case 'bus':
      return distanceKm * factors.bus;
    case 'train':
      return distanceKm * factors.train;
    case 'flight':
      return distanceKm * factors.flight;
    case 'bike_walk':
      return factors.bike_walk;
    default:
      return 0;
  }
}

/**
 * Calculates total carbon emissions from food consumption.
 * 
 * @param type The type of meal or food consumed (e.g. meat_meal, dairy, etc.)
 * @param servings The number of servings consumed.
 * @returns The calculated CO2 emissions in kilograms (defaults to 0 for negative/zero servings).
 */
export function calculateFoodCO2(type: string, servings: number): number {
  if (servings <= 0) return 0;

  const factors = EMISSION_FACTORS.food;
  switch (type) {
    case 'meat_meal':
      return servings * factors.meat_meal;
    case 'vegetarian_meal':
      return servings * factors.vegetarian_meal;
    case 'vegan_meal':
      return servings * factors.vegan_meal;
    case 'dairy':
      return servings * factors.dairy;
    default:
      return 0;
  }
}

/**
 * Calculates total carbon emissions from household energy usage.
 * 
 * @param type The type of energy used (e.g. electricity_kwh, lpg_kg, ac_hours)
 * @param quantity The amount consumed (e.g. kWh, kg, or hours)
 * @param customFactor Optional custom multiplier for electricity grid intensity
 * @returns The calculated CO2 emissions in kilograms (defaults to 0 for negative/zero quantities).
 */
export function calculateEnergyCO2(type: string, quantity: number, customFactor?: number): number {
  if (quantity <= 0) return 0;

  const factors = EMISSION_FACTORS.energy;
  switch (type) {
    case 'electricity_kwh':
      return quantity * (customFactor !== undefined ? customFactor : factors.electricity_kwh);
    case 'lpg_kg':
      return quantity * factors.lpg_kg;
    case 'ac_hours':
      return quantity * factors.ac_hours;
    default:
      return 0;
  }
}

/**
 * Calculates total carbon emissions from retail shopping items.
 * 
 * @param type The type of item purchased (e.g. clothing, electronics, plastic_item)
 * @param quantity The number of items purchased.
 * @returns The calculated CO2 emissions in kilograms (defaults to 0 for negative/zero quantities).
 */
export function calculateShoppingCO2(type: string, quantity: number): number {
  if (quantity <= 0) return 0;

  const factors = EMISSION_FACTORS.shopping;
  switch (type) {
    case 'clothing':
      return quantity * factors.clothing;
    case 'electronics':
      return quantity * factors.electronics;
    case 'plastic_item':
      return quantity * factors.plastic_item;
    default:
      return 0;
  }
}

/**
 * Compiles a comprehensive EcoScore metrics analysis.
 * 
 * @param monthlyKg The user's accumulated carbon footprint for the past 30 days in kg CO2.
 * @param nationalDailyAvgKg The country's daily average emissions (defaults to India avg: 5.21kg).
 * @returns A detailed EcoScore object with ratings, labels, and comparisons.
 */
export const calculateEcoScore = (
  monthlyKg: number,
  nationalDailyAvgKg: number = INDIA_DAILY_AVG_CO2
): EcoScore => {
  const annualKg = monthlyKg * 12;
  const score = Math.max(0, Math.round(
    100 - (annualKg / SAFETY_LIMITS.ANNUAL_TARGET_CO2) * 100
  ));
  const userDailyAvg = monthlyKg / 30;
  const vsIndiaPercent = Math.round(
    ((nationalDailyAvgKg - userDailyAvg) / nationalDailyAvgKg) * 100
  );
  const vsGlobalPercent = Math.round(
    ((GLOBAL_DAILY_AVG_CO2 - userDailyAvg) / GLOBAL_DAILY_AVG_CO2) * 100
  );
  const vsIndia = vsIndiaPercent > 0
    ? `${vsIndiaPercent}% better than India avg`
    : `${Math.abs(vsIndiaPercent)}% above India avg`;
  const vsGlobal = vsGlobalPercent > 0
    ? `${vsGlobalPercent}% better than global avg`
    : `${Math.abs(vsGlobalPercent)}% above global avg`;

  if (score >= 80) return {
    score, label: 'Carbon Hero',
    color: '#15803d', ringColor: '#22c55e',
    message: 'Outstanding! You are a climate champion.',
    vsIndia, vsGlobal
  };
  if (score >= 60) return {
    score, label: 'On Track',
    color: '#0369a1', ringColor: '#38bdf8',
    message: 'Good progress. Keep pushing forward!',
    vsIndia, vsGlobal
  };
  if (score >= 40) return {
    score, label: 'Needs Work',
    color: '#b45309', ringColor: '#f59e0b',
    message: 'Room to improve. Check AI recommendations.',
    vsIndia, vsGlobal
  };
  return {
    score, label: 'Critical',
    color: '#b91c1c', ringColor: '#ef4444',
    message: 'Urgent action needed. Start with quick wins.',
    vsIndia, vsGlobal
  };
};
