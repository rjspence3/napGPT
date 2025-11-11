import { useNapStore } from "./state";

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
 */
export function initBlanketAuto() {
  let checkInterval: NodeJS.Timeout | null = null;

  const checkBlanket = () => {
    const state = useNapStore.getState();
    const { effort, idleSince, napTimerEnabled, blanketOn, toggleBlanket } = state;

    // Check effort threshold
    const lowEffort = effort < BLANKET_EFFORT_THRESH;

    // Check idle threshold
    let idleTooLong = false;
    if (napTimerEnabled && idleSince !== null) {
      const idleTime = Date.now() - idleSince;
      idleTooLong = idleTime > BLANKET_IDLE_MS;
    }

    const shouldBeOn = lowEffort || idleTooLong;

    if (shouldBeOn !== blanketOn) {
      toggleBlanket();
    }
  };

  // Check immediately
  checkBlanket();

  // Set up interval to check periodically
  checkInterval = setInterval(checkBlanket, 1000);

  // Export check function for testing
  if (typeof window !== 'undefined') {
    (window as any).__nap_blanket_check = checkBlanket;
  }

  // Return cleanup function
  return () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    if (typeof window !== 'undefined') {
      delete (window as any).__nap_blanket_check;
    }
  };
}

