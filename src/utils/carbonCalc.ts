/**
 * EcoTrace Carbon Footprint Calculations
 * All calculations return values in kg of CO2.
 * Zeros and negative inputs default to 0.
 */

export function calculateTransportCO2(type: string, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  
  switch (type) {
    case 'car_petrol':
      return distanceKm * 0.21;
    case 'car_diesel':
      return distanceKm * 0.17;
    case 'car_electric':
      return distanceKm * 0.05;
    case 'bus':
      return distanceKm * 0.089;
    case 'train':
      return distanceKm * 0.041;
    case 'flight':
      return distanceKm * 0.255;
    case 'bike_walk':
      return 0;
    default:
      return 0;
  }
}

export function calculateFoodCO2(type: string, servings: number): number {
  if (servings <= 0) return 0;

  switch (type) {
    case 'meat_meal':
      return servings * 6.61;
    case 'vegetarian_meal':
      return servings * 1.69;
    case 'vegan_meal':
      return servings * 1.05;
    case 'dairy':
      return servings * 3.2;
    default:
      return 0;
  }
}

export function calculateEnergyCO2(type: string, quantity: number, customFactor?: number): number {
  if (quantity <= 0) return 0;

  switch (type) {
    case 'electricity_kwh':
      return quantity * (customFactor !== undefined ? customFactor : 0.82);
    case 'lpg_kg':
      return quantity * 2.98;
    case 'ac_hours':
      return quantity * 1.25;
    default:
      return 0;
  }
}

export function calculateShoppingCO2(type: string, quantity: number): number {
  if (quantity <= 0) return 0;

  switch (type) {
    case 'clothing':
      return quantity * 10.0;
    case 'electronics':
      return quantity * 70.0;
    case 'plastic_item':
      return quantity * 6.0;
    default:
      return 0;
  }
}

export interface EcoScore {
  score: number;
  label: 'Carbon Hero' | 'On Track' | 'Needs Work' | 'Critical';
  color: string;
  ringColor: string;
  message: string;
  vsIndia: string;    // vs India average
  vsGlobal: string;  // vs global average
}

export const calculateEcoScore = (
  monthlyKg: number,
  nationalDailyAvgKg: number = 5.21
): EcoScore => {
  const annualKg = monthlyKg * 12;
  const score = Math.max(0, Math.round(
    100 - (annualKg / 4000) * 100
  ));
  const userDailyAvg = monthlyKg / 30;
  const vsIndiaPercent = Math.round(
    ((nationalDailyAvgKg - userDailyAvg) / 
      nationalDailyAvgKg) * 100
  );
  const vsGlobalPercent = Math.round(
    ((10.96 - userDailyAvg) / 10.96) * 100
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
