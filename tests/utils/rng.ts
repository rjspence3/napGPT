/**
 * Seeded RNG wrapper for deterministic tests
 * Simple LCG (Linear Congruential Generator)
 */

let seed: number | null = null;
let rngState: number = 0;

/**
 * Initialize RNG with seed
 */
export function initRng(newSeed: number): void {
  seed = newSeed;
  rngState = seed % 2147483647;
  if (rngState <= 0) rngState += 2147483646;
}

/**
 * Get next random number [0, 1)
 */
export function random(): number {
  if (seed === null) {
    throw new Error('RNG not initialized. Call initRng(seed) first.');
  }
  rngState = (rngState * 16807) % 2147483647;
  return (rngState - 1) / 2147483646;
}

/**
 * Random integer in range [min, max)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min)) + min;
}

/**
 * Random choice from array
 */
export function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length)];
}

/**
 * Reset RNG (use Math.random() again)
 */
export function resetRng(): void {
  seed = null;
  rngState = 0;
}

/**
 * Run function with seeded RNG, auto-reset
 */
export async function withSeededRng<T>(seed: number, fn: () => Promise<T>): Promise<T> {
  initRng(seed);
  try {
    return await fn();
  } finally {
    resetRng();
  }
}

