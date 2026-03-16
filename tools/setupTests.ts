import '@testing-library/jest-dom';
import { vi } from 'vitest';

declare global {
  interface Window {
    openmrsBase: string;
    spaBase: string;
    getOpenmrsSpaBase: () => string;
  }
}

// Provide a Jest-compatible global using Vitest's vi API,
// so existing tests that reference `jest` continue to work.
const jestLike = (globalThis as any).jest ?? vi;
(globalThis as any).jest = jestLike;

jestLike.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultNameSpace: string) => defaultNameSpace,
  }),
}));

window.openmrsBase = '/openmrs';
window.spaBase = '/spa';
window.getOpenmrsSpaBase = () => '/openmrs/spa/';
window.HTMLElement.prototype.scrollIntoView = jestLike.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jestLike.fn(),
    removeEventListener: jestLike.fn(),
    dispatchEvent: jestLike.fn(),
  }),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = jestLike.fn();
  unobserve = jestLike.fn();
  disconnect = jestLike.fn();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserverMock;
