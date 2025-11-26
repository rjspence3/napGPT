/**
 * Seedable random number generator for deterministic testing
 * Uses mulberry32 algorithm for fast, good-quality PRNG
 */

let seed: number | null = null;
let rngState: number = 0;

/**
 * Initialize RNG with a seed (for deterministic tests)
 * @param s - Seed value (integer)
 */
export function setSeed(s: number | null): void {
  seed = s;
  if (s !== null) {
    rngState = s % 2147483647;
    if (rngState <= 0) rngState += 2147483646;
  }
}

/**
 * Get current seed or null if not set
 */
export function getSeed(): number | null {
  return seed;
}

let overrideFn: (() => number) | null = null;

/**
 * Override the RNG with a custom function (for unit tests)
 */
export function setTestRandomGenerator(fn: (() => number) | null): void {
  overrideFn = fn;
}

/**
 * Get a random number between 0 and 1
 * Uses seeded RNG if seed is set, otherwise falls back to Math.random()
 */
export function getTestRandom(): number {
  if (overrideFn) {
    return overrideFn();
  }
  if (seed !== null) {
    // Mulberry32 algorithm
    rngState = (rngState * 16807) % 2147483647;
    return (rngState - 1) / 2147483646;
  }
  return Math.random();
}

/**
 * Initialize RNG from environment or window variable
 * Called automatically on module load
 */
function initFromEnv(): void {
  // Check server-side env
  if (typeof process !== 'undefined' && process.env.NAPGPT_TEST_SEED) {
    const envSeed = parseInt(process.env.NAPGPT_TEST_SEED, 10);
    if (!isNaN(envSeed)) {
      setSeed(envSeed);
      return;
    }
  }

  // Check client-side window variable
  if (typeof window !== 'undefined' && (window as any).__nap_test_seed) {
    const windowSeed = parseInt((window as any).__nap_test_seed, 10);
    if (!isNaN(windowSeed)) {
      setSeed(windowSeed);
      return;
    }
  }

  // No seed provided, use Math.random() fallback
  setSeed(null);
}

// Auto-initialize on module load
initFromEnv();
