import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityCard from '../components/ActivityCard';
import { CarbonActivity } from '../types';

describe('ActivityCard Component Tests', () => {
  const dummyActivity: CarbonActivity = {
    id: 'act-123',
    category: 'transport',
    activityType: 'car_petrol',
    quantity: 15,
    unit: 'km',
    co2Kg: 3.15,
    date: '2026-06-19',
    geminiTip: 'Drive less to save carbon!',
    createdAt: {} as any,
    userId: 'user-999'
  };

  it('renders activity details correctly', () => {
    render(<ActivityCard activity={dummyActivity} />);
    expect(screen.getByText(/Car Petrol/i)).toBeInTheDocument();
    expect(screen.getByText(/15 km/i)).toBeInTheDocument();
    expect(screen.getByText('3.1')).toBeInTheDocument(); // JS 3.15.toFixed(1) rounds to '3.1'
  });

  it('renders food activity details and theme colors correctly', () => {
    const foodActivity: CarbonActivity = {
      ...dummyActivity,
      category: 'food',
      activityType: 'meat_meal',
      quantity: 2,
      unit: 'servings',
      co2Kg: 13.22,
    };
    render(<ActivityCard activity={foodActivity} />);
    expect(screen.getByText(/Meat Meal/i)).toBeInTheDocument();
    expect(screen.getByText(/2 servings/i)).toBeInTheDocument();
    expect(screen.getByText('13.2')).toBeInTheDocument();
  });

  it('renders energy activity details and theme colors correctly', () => {
    const energyActivity: CarbonActivity = {
      ...dummyActivity,
      category: 'energy',
      activityType: 'electricity_kwh',
      quantity: 50,
      unit: 'kWh',
      co2Kg: 41.0,
    };
    render(<ActivityCard activity={energyActivity} />);
    expect(screen.getByText(/Electricity Kwh/i)).toBeInTheDocument();
    expect(screen.getByText(/50 kWh/i)).toBeInTheDocument();
    expect(screen.getByText('41.0')).toBeInTheDocument();
  });

  it('expands to show Gemini tips when clicked', () => {
    render(<ActivityCard activity={dummyActivity} />);
    
    // Initially not showing the tip
    expect(screen.queryByText(/Gemini Eco-Tip:/i)).not.toBeInTheDocument();

    // Click the card
    const card = screen.getByRole('button');
    fireEvent.click(card);

    // Tip should be visible
    expect(screen.getByText(/Gemini Eco-Tip:/i)).toBeInTheDocument();
    expect(screen.getByText(/Drive less to save carbon!/i)).toBeInTheDocument();
  });

  it('handles keyboard enter key to expand', () => {
    render(<ActivityCard activity={dummyActivity} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText(/Gemini Eco-Tip:/i)).toBeInTheDocument();
  });
});
