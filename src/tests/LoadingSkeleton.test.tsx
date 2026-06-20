
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSkeleton from '../components/LoadingSkeleton';

describe('LoadingSkeleton Component Tests', () => {
  it('renders card variant by default', () => {
    const { container } = render(<LoadingSkeleton />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('renders ring variant', () => {
    const { container } = render(<LoadingSkeleton variant="ring" />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('renders chart variant', () => {
    const { container } = render(<LoadingSkeleton variant="chart" />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('renders line variant', () => {
    const { container } = render(<LoadingSkeleton variant="line" />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('renders list variant with custom count', () => {
    const { container } = render(<LoadingSkeleton variant="list" count={3} />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBe(9); // 3 items, each containing 3 pulse subdivisions
  });
});
