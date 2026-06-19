import {
  calculateTransportCO2,
  calculateFoodCO2,
  calculateEnergyCO2,
  calculateShoppingCO2,
  calculateEcoScore
} from './carbonCalc';

describe('Carbon Calculation Logic', () => {
  
  describe('calculateTransportCO2', () => {
    test('standard case: petrol car', () => {
      expect(calculateTransportCO2('car_petrol', 10)).toBeCloseTo(2.1);
    });

    test('standard case: flight', () => {
      expect(calculateTransportCO2('flight', 1000)).toBeCloseTo(255);
    });

    test('standard case: diesel car', () => {
      expect(calculateTransportCO2('car_diesel', 10)).toBeCloseTo(1.7);
    });

    test('standard case: electric car', () => {
      expect(calculateTransportCO2('car_electric', 10)).toBeCloseTo(0.5);
    });

    test('standard case: bus', () => {
      expect(calculateTransportCO2('bus', 10)).toBeCloseTo(0.89);
    });

    test('standard case: train', () => {
      expect(calculateTransportCO2('train', 100)).toBeCloseTo(4.1);
    });

    test('standard case: unknown transport', () => {
      expect(calculateTransportCO2('submarine', 10)).toBe(0);
    });

    test('standard case: bike/walk is zero carbon', () => {
      expect(calculateTransportCO2('bike_walk', 15)).toBe(0);
    });

    test('edge case: zero distance', () => {
      expect(calculateTransportCO2('car_petrol', 0)).toBe(0);
    });

    test('edge case: negative distance', () => {
      expect(calculateTransportCO2('car_diesel', -10)).toBe(0);
    });
  });

  describe('calculateFoodCO2', () => {
    test('standard case: meat meal', () => {
      expect(calculateFoodCO2('meat_meal', 2)).toBeCloseTo(13.22);
    });

    test('standard case: vegetarian meal', () => {
      expect(calculateFoodCO2('vegetarian_meal', 3)).toBeCloseTo(5.07);
    });

    test('standard case: vegan meal', () => {
      expect(calculateFoodCO2('vegan_meal', 1)).toBeCloseTo(1.05);
    });

    test('standard case: dairy', () => {
      expect(calculateFoodCO2('dairy', 2)).toBeCloseTo(6.4);
    });

    test('standard case: unknown food', () => {
      expect(calculateFoodCO2('unknown_food', 2)).toBe(0);
    });

    test('edge case: zero servings', () => {
      expect(calculateFoodCO2('dairy', 0)).toBe(0);
    });

    test('edge case: negative servings', () => {
      expect(calculateFoodCO2('meat_meal', -2)).toBe(0);
    });
  });

  describe('calculateEnergyCO2', () => {
    test('standard case: electricity kwh', () => {
      expect(calculateEnergyCO2('electricity_kwh', 100)).toBeCloseTo(82);
    });

    test('standard case: electricity with custom factor', () => {
      expect(calculateEnergyCO2('electricity_kwh', 100, 0.92)).toBeCloseTo(92);
    });

    test('standard case: lpg kg', () => {
      expect(calculateEnergyCO2('lpg_kg', 10)).toBeCloseTo(29.8);
    });

    test('standard case: AC usage', () => {
      expect(calculateEnergyCO2('ac_hours', 5)).toBeCloseTo(6.25);
    });

    test('standard case: unknown energy', () => {
      expect(calculateEnergyCO2('nuclear', 10)).toBe(0);
    });

    test('edge case: zero quantity', () => {
      expect(calculateEnergyCO2('electricity_kwh', 0)).toBe(0);
    });

    test('edge case: negative quantity', () => {
      expect(calculateEnergyCO2('lpg_kg', -5)).toBe(0);
    });
  });

  describe('calculateShoppingCO2', () => {
    test('standard case: clothing', () => {
      expect(calculateShoppingCO2('clothing', 3)).toBeCloseTo(30);
    });

    test('standard case: electronics', () => {
      expect(calculateShoppingCO2('electronics', 1)).toBeCloseTo(70);
    });

    test('standard case: plastic items', () => {
      expect(calculateShoppingCO2('plastic_item', 5)).toBeCloseTo(30);
    });

    test('standard case: unknown shopping', () => {
      expect(calculateShoppingCO2('luxury_yacht', 1)).toBe(0);
    });

    test('edge case: zero quantity', () => {
      expect(calculateShoppingCO2('electronics', 0)).toBe(0);
    });

    test('edge case: negative quantity', () => {
      expect(calculateShoppingCO2('clothing', -1)).toBe(0);
    });
  });

  describe('Total calculation across multiple categories', () => {
    test('correctly aggregates carbon across all 4 categories', () => {
      const transportCO2 = calculateTransportCO2('car_petrol', 50); // 50 * 0.21 = 10.5
      const foodCO2 = calculateFoodCO2('meat_meal', 2); // 2 * 6.61 = 13.22
      const energyCO2 = calculateEnergyCO2('electricity_kwh', 200); // 200 * 0.82 = 164.0
      const shoppingCO2 = calculateShoppingCO2('clothing', 2); // 2 * 10 = 20.0

      const totalCO2 = transportCO2 + foodCO2 + energyCO2 + shoppingCO2;
      expect(totalCO2).toBeCloseTo(207.72);
    });
  });

  describe('calculateEcoScore', () => {
    it('returns Carbon Hero for low emissions', () => {
      const result = calculateEcoScore(50); // 50kg/month
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.label).toBe('Carbon Hero');
    });
    it('returns Critical for very high emissions', () => {
      const result = calculateEcoScore(500); // 500kg/month
      expect(result.score).toBeLessThan(40);
      expect(result.label).toBe('Critical');
    });
    it('score never goes below 0', () => {
      const result = calculateEcoScore(9999);
      expect(result.score).toBe(0);
    });
    it('computes vsIndia correctly', () => {
      // 5.21kg/day avg = 156.3kg/month
      const result = calculateEcoScore(100, 5.21);
      expect(result.vsIndia).toContain('better');
    });
    it('returns On Track or Needs Work for medium ranges', () => {
      const onTrack = calculateEcoScore(100);
      expect(onTrack.label).toBe('On Track');
      const needsWork = calculateEcoScore(180);
      expect(needsWork.label).toBe('Needs Work');
    });
  });

});

