/**
 * Unit tests for testRandom utility
 */

import { getTestRandom, setSeed, getSeed } from "../testRandom";

describe("testRandom", () => {
  beforeEach(() => {
    // Reset seed before each test
    setSeed(null);
  });

  it("should return a number between 0 and 1", () => {
    const value = getTestRandom();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it("should return deterministic values when seeded", () => {
    setSeed(12345);
    const values1 = Array.from({ length: 5 }, () => getTestRandom());
    
    setSeed(12345);
    const values2 = Array.from({ length: 5 }, () => getTestRandom());
    
    expect(values1).toEqual(values2);
  });

  it("should return different values for different seeds", () => {
    setSeed(12345);
    const value1 = getTestRandom();
    
    setSeed(67890);
    const value2 = getTestRandom();
    
    expect(value1).not.toBe(value2);
  });

  it("should fall back to Math.random when seed is null", () => {
    setSeed(null);
    const values = Array.from({ length: 10 }, () => getTestRandom());
    
    // Should have some variation (very unlikely all same)
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBeGreaterThan(1);
  });

  it("should handle seed 0 correctly", () => {
    setSeed(0);
    const value = getTestRandom();
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it("getSeed should return current seed", () => {
    setSeed(12345);
    expect(getSeed()).toBe(12345);
    
    setSeed(null);
    expect(getSeed()).toBeNull();
  });

  it("should produce different sequences for same seed after reset", () => {
    setSeed(12345);
    const seq1 = Array.from({ length: 3 }, () => getTestRandom());
    
    setSeed(12345);
    const seq2 = Array.from({ length: 3 }, () => getTestRandom());
    
    expect(seq1).toEqual(seq2);
  });
});
