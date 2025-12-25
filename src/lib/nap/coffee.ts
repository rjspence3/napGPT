import { useNapStore } from "./state";

const BEAN_TICK_MS = parseInt(
  process.env.NEXT_PUBLIC_NAPGPT_BEAN_TICK_MS || "10000",
  10
);

// Module-level singleton state to prevent duplicate tickers
let tickerInitialized = false;
let tickInterval: NodeJS.Timeout | null = null;
let unsubscribe: (() => void) | null = null;
let lastActivityTime = Date.now();
let refCount = 0;

/**
 * Initialize bean ticker that earns beans while idle
 * Uses singleton pattern to ensure only one ticker runs regardless of remounts
 * Should be called once from a client-side effect
 */
export function initBeanTicker() {
  refCount++;

  // Only initialize once
  if (!tickerInitialized) {
    tickerInitialized = true;

    const checkIdle = () => {
      const state = useNapStore.getState();
      const { idleSince, earnBean } = state;

      // Check if truly idle (no activity for BEAN_TICK_MS)
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      if (idleSince !== null && timeSinceActivity >= BEAN_TICK_MS) {
        earnBean();
        lastActivityTime = now; // Reset to prevent multiple earns in one tick
      }
    };

    // Set up interval to check periodically
    tickInterval = setInterval(checkIdle, BEAN_TICK_MS);

    // Track activity (user input, messages, etc.)
    const trackActivity = () => {
      lastActivityTime = Date.now();
    };

    // Subscribe to store changes to track activity
    unsubscribe = useNapStore.subscribe(() => {
      // Any state change indicates activity
      trackActivity();
    });
  }

  // Return cleanup function that only cleans up when last reference is removed
  return () => {
    refCount--;
    if (refCount === 0 && tickerInitialized) {
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      tickerInitialized = false;
    }
  };
}

