/**
 * Seeded RNG for deterministic test runs
 */
export class SeededRNG {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Generate a random number between 0 and 1
   */
  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T {
    return array[this.randomInt(0, array.length)];
  }

  /**
   * Set a new seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }
}

// Global instance for test determinism
let globalRNG: SeededRNG | null = null;

export function getRNG(seed?: number): SeededRNG {
  if (!globalRNG) {
    globalRNG = new SeededRNG(seed);
  }
  if (seed !== undefined) {
    globalRNG.setSeed(seed);
  }
  return globalRNG;
}

export function resetRNG(seed?: number): void {
  globalRNG = seed !== undefined ? new SeededRNG(seed) : null;
}


