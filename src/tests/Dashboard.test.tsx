import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { ThemeProvider } from '../context/ThemeContext';
import { LiveDataProvider } from '../context/LiveDataContext';

// Mock the Auth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123' },
    profile: { displayName: 'Green Ranger', currentStreak: 4, longestStreak: 12 },
    loading: false,
    error: null
  })
}));

// Mock the Carbon hook
vi.mock('../hooks/useCarbon', () => ({
  useCarbon: () => ({
    activities: [
      {
        id: 'act1',
        category: 'transport',
        activityType: 'car_petrol',
        quantity: 20,
        unit: 'km',
        co2Kg: 4.2,
        date: new Date().toISOString().split('T')[0],
        geminiTip: 'Try using the bus to save 2kg CO2.'
      }
    ],
    summary: {
      todayKg: 4.2,
      weekKg: 4.2,
      monthKg: 12.5,
      streak: 4
    },
    loading: false,
    error: null,
    logActivity: vi.fn(),
    updateProfileSettings: vi.fn()
  })
}));

// Mock the AQI hook
vi.mock('../hooks/useAirQuality', () => ({
  useAirQuality: () => ({
    data: {
      aqi: 2,
      level: 'Moderate',
      pm25: 18,
      pm10: 45,
      color: '#84cc16',
      advice: 'Acceptable air quality.',
      icon: '🙂'
    },
    loading: false,
    error: null
  })
}));

// Mock the daily challenge hook
vi.mock('../hooks/useDailyChallenge', () => ({
  useDailyChallenge: () => ({
    challenge: {
      title: 'Meatless Monday',
      description: 'Eat vegetarian meals today.',
      savingKg: 4.92,
      category: 'food',
      difficulty: 'easy',
      date: new Date().toISOString().split('T')[0]
    },
    loading: false
  })
}));

describe('Dashboard Component Tests', () => {
  const renderDashboard = () => {
    return render(
      <ThemeProvider>
        <LiveDataProvider>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </LiveDataProvider>
      </ThemeProvider>
    );
  };

  it('renders greeting header with displayName', () => {
    renderDashboard();
    expect(screen.getByText(/Welcome back, Green Ranger!/i)).toBeInTheDocument();
  });

  it('displays the carbon score ring and target metrics', () => {
    renderDashboard();
    expect(screen.getByText(/Weekly Carbon Score/i)).toBeInTheDocument();
    expect(screen.getByText(/India Target:/i)).toBeInTheDocument();
  });

  it('renders the grid status and air quality reports', () => {
    renderDashboard();
    expect(screen.getByText(/INDIA ELECTRICITY GRID/i)).toBeInTheDocument();
    expect(screen.getByText(/AIR QUALITY/i, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/AQI 2/i)).toBeInTheDocument();
  });

  it('displays the daily challenge card with action button', () => {
    renderDashboard();
    expect(screen.getByText(/TODAY'S ECO CHALLENGE/i)).toBeInTheDocument();
    expect(screen.getByText(/Meatless Monday/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept today's challenge/i })).toBeInTheDocument();
  });

  it('renders the logging streak metrics card', () => {
    renderDashboard();
    expect(screen.getByText(/Logging Streak/i)).toBeInTheDocument();
    // Two occurrences: 4 days streak and 4 weeks/benchmark etc. The streak itself has value 4.
    expect(screen.getAllByText('4')).toBeDefined();
  });
});
