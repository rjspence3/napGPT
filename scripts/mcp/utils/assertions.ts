/**
 * Assertion helpers for test scenarios
 */

export class AssertionError extends Error {
  constructor(message: string, public actual?: any, public expected?: any) {
    super(message);
    this.name = "AssertionError";
  }
}

export interface Assertions {
  assert(condition: boolean, message: string): void;
  assertEquals<T>(actual: T, expected: T, message?: string): void;
  assertNotEmpty(value: string, message?: string): void;
  assertContains(haystack: string, needle: string, message?: string): void;
  assertGreaterThan(actual: number, expected: number, message?: string): void;
  assertLessThan(actual: number, expected: number, message?: string): void;
  assertBetween(value: number, min: number, max: number, message?: string): void;
  assertTrue(value: boolean, message?: string): void;
  assertFalse(value: boolean, message?: string): void;
}

export function createAssertions(): Assertions {
  return {
    assert(condition: boolean, message: string) {
      if (!condition) {
        throw new AssertionError(message);
      }
    },

    assertEquals<T>(actual: T, expected: T, message?: string) {
      if (actual !== expected) {
        throw new AssertionError(
          message || `Expected ${expected}, got ${actual}`,
          actual,
          expected
        );
      }
    },

    assertNotEmpty(value: string, message?: string) {
      if (!value || value.trim().length === 0) {
        throw new AssertionError(message || "Expected non-empty string", value);
      }
    },

    assertContains(haystack: string, needle: string, message?: string) {
      if (!haystack.includes(needle)) {
        throw new AssertionError(
          message || `Expected "${haystack}" to contain "${needle}"`,
          haystack,
          needle
        );
      }
    },

    assertGreaterThan(actual: number, expected: number, message?: string) {
      if (actual <= expected) {
        throw new AssertionError(
          message || `Expected ${actual} to be greater than ${expected}`,
          actual,
          expected
        );
      }
    },

    assertLessThan(actual: number, expected: number, message?: string) {
      if (actual >= expected) {
        throw new AssertionError(
          message || `Expected ${actual} to be less than ${expected}`,
          actual,
          expected
        );
      }
    },

    assertBetween(value: number, min: number, max: number, message?: string) {
      if (value < min || value > max) {
        throw new AssertionError(
          message || `Expected ${value} to be between ${min} and ${max}`,
          value,
          { min, max }
        );
      }
    },

    assertTrue(value: boolean, message?: string) {
      if (!value) {
        throw new AssertionError(message || "Expected true", value, true);
      }
    },

    assertFalse(value: boolean, message?: string) {
      if (value) {
        throw new AssertionError(message || "Expected false", value, false);
      }
    },
  };
}


