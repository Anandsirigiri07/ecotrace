import { CarbonActivity } from '../types';

export interface Recommendation {
  id: string;
  category: 'transport' | 'food' | 'energy' | 'shopping';
  title: string;
  action: string;
  savingKg: number;
  difficulty: 'easy' | 'medium' | 'hard';
  impactPercentage: number;
}

/**
 * Analyzes historical carbon activity logs and yields personalized sustainability recommendations.
 * If transport is the dominant source, it recommends public transit. If food is, it suggests diet changes, etc.
 * 
 * @param activities List of CarbonActivity logs
 * @returns Array of tailored Recommendations
 */
export function generateRecommendations(activities: CarbonActivity[]): Recommendation[] {
  const total = activities.reduce((sum, act) => sum + act.co2Kg, 0);
  const byCategory = activities.reduce((acc, act) => {
    acc[act.category] = (acc[act.category] || 0) + act.co2Kg;
    return acc;
  }, {} as Record<string, number>);

  const recommendations: Recommendation[] = [];

  if (total === 0) {
    // Default recommendations if no data exists
    return [
      {
        id: 'rec_def_transport',
        category: 'transport',
        title: 'Choose Active Transit',
        action: 'Walk or cycle for distances under 2km. Take public transit for longer commutes.',
        savingKg: 4.5,
        difficulty: 'easy',
        impactPercentage: 25
      },
      {
        id: 'rec_def_food',
        category: 'food',
        title: 'Plant-Based Dinners',
        action: 'Swap meat with lentils, beans, or fresh veggies twice a week.',
        savingKg: 3.8,
        difficulty: 'easy',
        impactPercentage: 20
      },
      {
        id: 'rec_def_energy',
        category: 'energy',
        title: 'AC Eco Temperature',
        action: 'Set your air conditioner to 25°C. Every degree higher saves ~6% energy.',
        savingKg: 2.1,
        difficulty: 'medium',
        impactPercentage: 15
      }
    ];
  }

  // Analyze Transport
  const transportTotal = byCategory['transport'] || 0;
  const transportPct = (transportTotal / total) * 100;
  if (transportPct > 35) {
    recommendations.push({
      id: 'rec_trend_transport',
      category: 'transport',
      title: 'Optimize Daily Commutes',
      action: `Transit represents ${transportPct.toFixed(0)}% of your carbon footprint. Opt for Bengaluru Namma Metro or carpool this week.`,
      savingKg: parseFloat((transportTotal * 0.15).toFixed(1)),
      difficulty: 'easy',
      impactPercentage: Math.round(transportPct)
    });
  }

  // Analyze Food
  const foodTotal = byCategory['food'] || 0;
  const foodPct = (foodTotal / total) * 100;
  if (foodPct > 30) {
    recommendations.push({
      id: 'rec_trend_food',
      category: 'food',
      title: 'Swap Diet Choices',
      action: `Diet contributes ${foodPct.toFixed(0)}% of your carbon footprint. Swapping out a meat meal for local vegetarian protein reduces daily emissions by over 10%.`,
      savingKg: parseFloat((foodTotal * 0.12).toFixed(1)),
      difficulty: 'easy',
      impactPercentage: Math.round(foodPct)
    });
  }

  // Analyze Energy
  const energyTotal = byCategory['energy'] || 0;
  const energyPct = (energyTotal / total) * 100;
  if (energyPct > 25) {
    recommendations.push({
      id: 'rec_trend_energy',
      category: 'energy',
      title: 'Reduce Phantom Loads',
      action: `Household energy accounts for ${energyPct.toFixed(0)}% of emissions. Turn off appliance switches when not in use to avoid vampire power draw.`,
      savingKg: parseFloat((energyTotal * 0.10).toFixed(1)),
      difficulty: 'medium',
      impactPercentage: Math.round(energyPct)
    });
  }

  // Analyze Shopping
  const shoppingTotal = byCategory['shopping'] || 0;
  const shoppingPct = (shoppingTotal / total) * 100;
  if (shoppingPct > 20) {
    recommendations.push({
      id: 'rec_trend_shopping',
      category: 'shopping',
      title: 'Conscious Consumerism',
      action: `Shopping represents ${shoppingPct.toFixed(0)}% of emissions. Carry a reusable bag and repair old items instead of replacing them.`,
      savingKg: parseFloat((shoppingTotal * 0.20).toFixed(1)),
      difficulty: 'medium',
      impactPercentage: Math.round(shoppingPct)
    });
  }

  // Fallback if we didn't generate enough specific recommendations
  if (recommendations.length < 2) {
    recommendations.push({
      id: 'rec_fallback_general',
      category: 'energy',
      title: 'Unplug Standby Devices',
      action: 'Unplug chargers and smart devices at night to prevent constant leakage current.',
      savingKg: 1.2,
      difficulty: 'easy',
      impactPercentage: 10
    });
  }

  return recommendations;
}
export default generateRecommendations;
