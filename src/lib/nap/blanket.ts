import { useNapStore } from "./state";
import { isTestMode, isDevelopmentMode } from "@/lib/utils/env";

const BLANKET_IDLE_MS = parseInt(
  process.env.NEXT_PUBLIC_NAPGPT_BLANKET_IDLE_MS || "30000",
  10
);
const BLANKET_EFFORT_THRESH = parseInt(
  process.env.NEXT_PUBLIC_NAPGPT_BLANKET_EFFORT_THRESH || "20",
  10
);

/**
 * Initialize automatic blanket mode based on effort and idle state
 * Should be called once from a client-side effect
 * Subscribes to Zustand store changes for reactive updates
 */
export function initBlanketAuto() {
  let checkInterval: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  const checkBlanket = () => {
    const state = useNapStore.getState();
    const { effort, idleSince, napTimerEnabled, blanketOn } = state;

    // Check effort threshold
    const lowEffort = effort < BLANKET_EFFORT_THRESH;

    // Check idle threshold
    let idleTooLong = false;
    if (napTimerEnabled && idleSince !== null) {
      const idleTime = Date.now() - idleSince;
      idleTooLong = idleTime >= BLANKET_IDLE_MS;
    }

    const shouldBeOn = lowEffort || idleTooLong;

    // Only toggle if state doesn't match
    if (shouldBeOn !== blanketOn) {
      useNapStore.setState({ blanketOn: shouldBeOn });
    }
  };

  // Subscribe to store changes (effort, idleSince, napTimerEnabled)
  // Zustand subscribe takes a callback that receives the state
  let lastEffort = useNapStore.getState().effort;
  let lastIdleSince = useNapStore.getState().idleSince;
  let lastNapTimerEnabled = useNapStore.getState().napTimerEnabled;
  
  unsubscribe = useNapStore.subscribe((state) => {
    // Only re-check if relevant state changed
    if (
      state.effort !== lastEffort ||
      state.idleSince !== lastIdleSince ||
      state.napTimerEnabled !== lastNapTimerEnabled
    ) {
      lastEffort = state.effort;
      lastIdleSince = state.idleSince;
      lastNapTimerEnabled = state.napTimerEnabled;
      checkBlanket();
    }
  });

  // Check immediately
  checkBlanket();

  // Set up interval to check periodically (for idle threshold)
  checkInterval = setInterval(checkBlanket, 1000);

  // Expose check function for testing (dev/test only — eliminated in production builds)
  if ((isDevelopmentMode() || isTestMode()) && typeof window !== 'undefined') {
    (window as any).__nap_blanket_check = checkBlanket;
  }

  // Return cleanup function
  return () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    if (unsubscribe) {
      unsubscribe();
    }
    if ((isDevelopmentMode() || isTestMode()) && typeof window !== 'undefined') {
      delete (window as any).__nap_blanket_check;
    }
  };
}

