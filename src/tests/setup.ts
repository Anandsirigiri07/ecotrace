import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Recharts in jsdom
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

// Vitest-Jest compatibility layer (typed properly)
type MockFn = ReturnType<typeof vi.fn>;

interface JestCompat {
  fn: (implementation?: (...args: unknown[]) => unknown) => MockFn;
  spyOn: <T extends object, K extends keyof T>(
    object: T, 
    method: K
  ) => ReturnType<typeof vi.spyOn>;
  clearAllMocks: () => void;
  resetAllMocks: () => void;
  restoreAllMocks: () => void;
}

const jestCompat: JestCompat = {
  fn: (implementation?) => vi.fn(implementation),
  spyOn: <T extends object, K extends keyof T>(
    object: T, 
    method: K
  ) => vi.spyOn(object, method as Parameters<typeof vi.spyOn<T, K>>[1]),
  clearAllMocks: () => vi.clearAllMocks(),
  resetAllMocks: () => vi.resetAllMocks(),
  restoreAllMocks: () => vi.restoreAllMocks(),
};

Object.defineProperty(globalThis, 'jest', {
  writable: true,
  configurable: true,
  value: jestCompat,
});
