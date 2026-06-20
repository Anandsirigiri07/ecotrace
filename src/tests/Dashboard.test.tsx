vi.mock('../services/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => () => {}),
  },
  db: {
    type: 'firestore',
    app: {},
    toJSON: vi.fn(),
  },
  googleProvider: {},
  analytics: null,
  goOnline: vi.fn(),
  goOffline: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(() => () => {}),
  })),
  GoogleAuthProvider: vi.fn(() => ({})),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  onSnapshot: vi.fn(() => () => {}),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  updateDoc: vi.fn(),
  enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
  Timestamp: { now: vi.fn(() => ({ toMillis: () => Date.now() })) },
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
  logEvent: vi.fn(),
}));

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

  it('renders recent activity logs section', () => {
    renderDashboard();
    expect(screen.getByText(/Recent Activity Logs/i)).toBeInTheDocument();
    // ActivityCard formats car_petrol → "Car Petrol"
    expect(screen.getByText(/Car Petrol/i)).toBeInTheDocument();
  });

  it('renders personalized recommendations section', () => {
    renderDashboard();
    // The recommendations engine runs on activities and produces recs
    expect(screen.getByText(/Personalized Recommendations/i)).toBeInTheDocument();
  });

  it('renders navigation action buttons', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /Log new carbon activity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask EcoTrace AI/i })).toBeInTheDocument();
  });

  it('shows EcoScore profile card when activities exist', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <LiveDataProvider>
            <Dashboard />
          </LiveDataProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/ecoscore profile/i)).toBeTruthy();
  });

  it('shows year in carbon heatmap section', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <LiveDataProvider>
            <Dashboard />
          </LiveDataProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/year in carbon/i)).toBeTruthy();
  });
});
