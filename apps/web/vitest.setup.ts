import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Polyfill ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: (scope?: string) => (key: string) => {
    // If we have a scope, we can simulate the translation key behavior
    // or just return the key. For most tests, returning the key is fine
    // as long as the test expects the key.
    // However, some tests expect specific values.
    // To be safe, we'll return a value that includes the scope if present.
    return scope ? `${scope}.${key}` : key;
  },
}));

