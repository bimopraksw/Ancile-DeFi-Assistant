import "@testing-library/jest-dom";
import { TestEnvironmentManager } from "@/lib/test-utils";

/**
 * Global test environment manager
 * Provides isolated test environments for all tests
 */
export const testEnv = new TestEnvironmentManager();

/**
 * Setup before all tests
 */
beforeAll(() => {
  testEnv.setup();
});

/**
 * Cleanup after all tests
 */
afterAll(() => {
  testEnv.teardown();
});

/**
 * Mock window.matchMedia for tests that use it
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

/**
 * Mock localStorage for tests
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

/**
 * Reset localStorage before each test
 */
beforeEach(() => {
  localStorageMock.clear();
});
