import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CarbonSavedCounter from '../components/CarbonSavedCounter';
import { useCarbon } from '../hooks/useCarbon';

vi.mock('../hooks/useCarbon', () => ({
  useCarbon: vi.fn()
}));

vi.mock('../context/LiveDataContext', () => ({
  useLiveData: () => ({
    nationalDailyAvgKg: 5.21
  })
}));

describe('CarbonSavedCounter Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and animates saved carbon when saved > 0', () => {
    vi.mocked(useCarbon).mockReturnValue({
      summary: { monthKg: 50 }
    } as any);
    vi.useFakeTimers();
    
    render(<CarbonSavedCounter />);
    expect(screen.getByText(/CO₂ SAVED VS INDIA AVERAGE/i)).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    
    expect(screen.getByText(/trees/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('handles case when saved <= 0', () => {
    vi.mocked(useCarbon).mockReturnValue({
      summary: { monthKg: 500 }
    } as any);
    
    render(<CarbonSavedCounter />);
    expect(screen.getByText(/Log activities to see your carbon savings/i)).toBeInTheDocument();
  });
});
