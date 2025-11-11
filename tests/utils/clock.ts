/**
 * Fake timers for deterministic tests
 * Wraps @sinonjs/fake-timers
 */

import { install, InstalledClock, uninstall } from '@sinonjs/fake-timers';

let clock: InstalledClock | null = null;

/**
 * Install fake timers with optional start time
 */
export function installFakeTimers(now: number | Date = Date.now()): InstalledClock {
  if (clock) {
    throw new Error('Fake timers already installed. Call uninstallFakeTimers() first.');
  }
  clock = install({
    now: typeof now === 'number' ? now : now.getTime(),
    toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
  return clock;
}

/**
 * Uninstall fake timers
 */
export function uninstallFakeTimers(): void {
  if (clock) {
    uninstall();
    clock = null;
  }
}

/**
 * Advance time by milliseconds
 */
export function advanceTime(ms: number): void {
  if (!clock) {
    throw new Error('Fake timers not installed. Call installFakeTimers() first.');
  }
  clock.tick(ms);
}

/**
 * Get current fake time
 */
export function getFakeTime(): number {
  if (!clock) {
    throw new Error('Fake timers not installed. Call installFakeTimers() first.');
  }
  return clock.now;
}

/**
 * Run async function with fake timers, auto-cleanup
 */
export async function withFakeTimers<T>(
  fn: (clock: InstalledClock) => Promise<T>,
  now: number | Date = Date.now()
): Promise<T> {
  const fakeClock = installFakeTimers(now);
  try {
    return await fn(fakeClock);
  } finally {
    uninstallFakeTimers();
  }
}

