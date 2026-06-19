import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Recharts ResponsiveContainer in jsdom testing environment
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;

// Enterprise mock mapping layer for Jest to Vitest compatibility (excluding hoisted mock macros)
const jestMock = {
  fn: (implementation?: any) => vi.fn(implementation),
  spyOn: (object: any, method: string) => vi.spyOn(object, method as any),
  clearAllMocks: () => vi.clearAllMocks(),
  resetAllMocks: () => vi.resetAllMocks(),
  restoreAllMocks: () => vi.restoreAllMocks(),
};

(globalThis as any).jest = jestMock;
