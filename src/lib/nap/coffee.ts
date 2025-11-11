import { useNapStore } from "./state";

const BEAN_TICK_MS = parseInt(
  process.env.NEXT_PUBLIC_NAPGPT_BEAN_TICK_MS || "10000",
  10
);

/**
 * Initialize bean ticker that earns beans while idle
 * Should be called once from a client-side effect
 */
export function initBeanTicker() {
  let tickInterval: NodeJS.Timeout | null = null;
  let lastActivityTime = Date.now();

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
  const unsubscribe = useNapStore.subscribe((state) => {
    // Any state change indicates activity
    trackActivity();
  });

  // Return cleanup function
  return () => {
    if (tickInterval) {
      clearInterval(tickInterval);
    }
    unsubscribe();
  };
}

