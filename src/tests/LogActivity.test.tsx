
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LogActivity from '../pages/LogActivity';
import { ThemeProvider } from '../context/ThemeContext';
import { LiveDataProvider } from '../context/LiveDataContext';

const mockLogActivity = vi.fn();
const mockGetInstantTip = vi.fn().mockResolvedValue('Tip: Take the bus!');

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123' },
    profile: { displayName: 'Green Ranger', currentStreak: 4, longestStreak: 12 },
    loading: false,
    error: null
  })
}));

// Mock useCarbon
vi.mock('../hooks/useCarbon', () => ({
  useCarbon: () => ({
    activities: [],
    loading: false,
    error: null,
    logActivity: mockLogActivity
  })
}));

// Mock useGemini
vi.mock('../hooks/useGemini', () => ({
  useGemini: () => ({
    getInstantTip: mockGetInstantTip,
    loading: false,
    error: null
  })
}));

describe('LogActivity Component Tests', () => {
  const renderLogActivity = () => {
    return render(
      <ThemeProvider>
        <LiveDataProvider>
          <BrowserRouter>
            <LogActivity />
          </BrowserRouter>
        </LiveDataProvider>
      </ThemeProvider>
    );
  };

  it('renders form elements with default transport tab selected', () => {
    renderLogActivity();
    expect(screen.getByText(/Log Carbon Activity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Activity Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
  });

  it('swaps categories when tabs are clicked', () => {
    renderLogActivity();
    
    // Diet tab click
    const dietTab = screen.getByRole('tab', { name: /DIET/i });
    fireEvent.click(dietTab);
    
    // Check that activity dropdown updates options
    expect(screen.getByText(/Meat Meal/i)).toBeInTheDocument();
  });

  it('calculates real-time CO2 estimates when quantity is entered', async () => {
    renderLogActivity();
    
    const qtyInput = screen.getByLabelText(/Quantity/i);
    fireEvent.change(qtyInput, { target: { value: '15.5' } });
    
    // Preview shows estimate: petrol car 0.21 * 15.5 = 3.26
    expect(screen.getByText('3.25')).toBeInTheDocument();
  });

  it('calls logActivity on successful form submission and opens tip modal', async () => {
    renderLogActivity();
    
    const qtyInput = screen.getByLabelText(/Quantity/i);
    fireEvent.change(qtyInput, { target: { value: '10' } });
    
    const submitBtn = screen.getByRole('button', { name: /Save Log/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockGetInstantTip).toHaveBeenCalled();
      expect(mockLogActivity).toHaveBeenCalledWith(
        'transport',
        'car_petrol',
        10,
        'km',
        2.1,
        'Tip: Take the bus!'
      );
    });

    // Verify modal is shown
    expect(screen.getByText(/Activity Logged successfully!/i)).toBeInTheDocument();
    expect(screen.getByText(/Tip: Take the bus!/i)).toBeInTheDocument();
  });

  it('shows CO2 preview when quantity entered', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    renderLogActivity();
    
    const input = screen.getByLabelText(/Quantity/i);
    // Clear first
    fireEvent.change(input, { target: { value: '' } });
    await userEvent.type(input, '15');
    
    expect(screen.getByText(/kg co/i)).toBeTruthy();
  });

  it('category buttons are all rendered', () => {
    renderLogActivity();
    expect(screen.getByText(/transit/i)).toBeTruthy();
    expect(screen.getByText(/diet/i)).toBeTruthy();
    expect(screen.getByText(/energy/i)).toBeTruthy();
    expect(screen.getByText(/retail/i)).toBeTruthy();
  });
});
