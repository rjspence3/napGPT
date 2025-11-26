/**
 * Environment and test mode detection utilities
 */

/**
 * Check if code is running in test mode
 * Returns true if:
 * - NODE_ENV === 'test'
 * - NEXT_PUBLIC_TEST_MODE === '1'
 * - window.__nap_test is set
 */
export function isTestMode(): boolean {
  // Server-side check
  if (typeof process !== 'undefined') {
    if (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true') {
      return true;
    }
    if (process.env.NEXT_PUBLIC_TEST_MODE === '1') {
      return true;
    }
  }

  // Client-side check
  if (typeof window !== 'undefined') {
    if ((window as any).__nap_test) {
      return true;
    }
    if (process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_TEST_MODE === '1') {
      return true;
    }
  }

  return false;
}

/**
 * Check if code is running in development mode
 */
export function isDevelopmentMode(): boolean {
  if (typeof process !== 'undefined') {
    return process.env.NODE_ENV === 'development';
  }
  return false;
}
