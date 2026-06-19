import { generateRecommendations } from './sustainabilityRecommendations';
import { CarbonActivity } from '../types';

describe('Sustainability Recommendations Engine', () => {
  it('returns default recommendations for empty activities list', () => {
    const recs = generateRecommendations([]);
    expect(recs.length).toBe(3);
    expect(recs[0].id).toBe('rec_def_transport');
    expect(recs[1].id).toBe('rec_def_food');
    expect(recs[2].id).toBe('rec_def_energy');
  });

  it('generates transport recommendation if transport is dominant (>35%)', () => {
    const activities: CarbonActivity[] = [
      {
        id: '1',
        category: 'transport',
        activityType: 'flight',
        quantity: 1000,
        unit: 'km',
        co2Kg: 255.0,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      },
      {
        id: '2',
        category: 'food',
        activityType: 'vegetarian_meal',
        quantity: 1,
        unit: 'serving',
        co2Kg: 1.69,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      }
    ];

    const recs = generateRecommendations(activities);
    const transportRec = recs.find(r => r.category === 'transport');
    expect(transportRec).toBeDefined();
    expect(transportRec?.id).toBe('rec_trend_transport');
    expect(transportRec?.impactPercentage).toBeGreaterThanOrEqual(99);
  });

  it('generates food recommendation if food is dominant (>30%)', () => {
    const activities: CarbonActivity[] = [
      {
        id: '1',
        category: 'food',
        activityType: 'meat_meal',
        quantity: 10,
        unit: 'serving',
        co2Kg: 66.1,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      },
      {
        id: '2',
        category: 'energy',
        activityType: 'electricity_kwh',
        quantity: 5,
        unit: 'kWh',
        co2Kg: 4.1,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      }
    ];

    const recs = generateRecommendations(activities);
    const foodRec = recs.find(r => r.category === 'food');
    expect(foodRec).toBeDefined();
    expect(foodRec?.id).toBe('rec_trend_food');
  });

  it('generates energy recommendation if energy is dominant (>25%)', () => {
    const activities: CarbonActivity[] = [
      {
        id: '1',
        category: 'energy',
        activityType: 'electricity_kwh',
        quantity: 100,
        unit: 'kWh',
        co2Kg: 82.0,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      },
      {
        id: '2',
        category: 'shopping',
        activityType: 'clothing',
        quantity: 1,
        unit: 'items',
        co2Kg: 10.0,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      }
    ];

    const recs = generateRecommendations(activities);
    const energyRec = recs.find(r => r.category === 'energy');
    expect(energyRec).toBeDefined();
    expect(energyRec?.id).toBe('rec_trend_energy');
  });

  it('generates shopping recommendation if shopping is dominant (>20%)', () => {
    const activities: CarbonActivity[] = [
      {
        id: '1',
        category: 'shopping',
        activityType: 'electronics',
        quantity: 1,
        unit: 'items',
        co2Kg: 70.0,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      },
      {
        id: '2',
        category: 'energy',
        activityType: 'electricity_kwh',
        quantity: 5,
        unit: 'kWh',
        co2Kg: 4.1,
        date: '2026-06-15',
        createdAt: null,
        geminiTip: ''
      }
    ];

    const recs = generateRecommendations(activities);
    const shoppingRec = recs.find(r => r.category === 'shopping');
    expect(shoppingRec).toBeDefined();
    expect(shoppingRec?.id).toBe('rec_trend_shopping');
  });
});
