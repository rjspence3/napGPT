import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** State for blanket overlay */
export type BlanketState = {
  /** Whether the blanket mode is active */
  blanketOn: boolean;
  /** Toggles the blanket mode */
  toggleBlanket: () => void;
};

/** State for coffee bean currency */
export type CoffeeState = {
  /** Current number of coffee beans */
  beans: number;
  /** Attempts to spend a bean. Returns true if successful. */
  spendBean: () => boolean;
  /** Earns a bean (up to max) */
  earnBean: () => void;
};

/**
 * Combined application state interface
 */
export interface NapState extends BlanketState, CoffeeState {
  /** Current effort level (0-100) */
  effort: number;
  /** Internal: stored interval ID for boost cooldown countdown (not persisted) */
  _boostIntervalId: ReturnType<typeof setInterval> | null;
  /** Current energy level (0-100) */
  energy: number;
  /** Timestamp when user became idle, or null if active */
  idleSince: number | null;
  /** Whether the user is currently considered "napping" (away) */
  isNapping: boolean;
  /** Remaining cooldown for boost in ms (for UI display) */
  boostCooldown: number;
  /** Timestamp when boost cooldown ends */
  boostCooldownUntil: number; // Timestamp when cooldown ends (for reliable state)
  /** Whether the auto-nap timer is enabled */
  napTimerEnabled: boolean;
  /** Sets the effort level explicitly */
  setEffort: (effort: number) => void;
  /** Consumes energy */
  consumeEnergy: (amount: number) => void;
  /** Refills energy if idle */
  refillEnergy: () => void;
  /** Activates boost if allowed */
  triggerBoost: () => void;
  /** Toggles the auto-nap timer */
  toggleNapTimer: () => void;
  /** Manually sets napping state */
  setNapping: (napping: boolean) => void;
  /** Updates idle state based on activity */
  updateIdle: () => void;
  /** Wakes from nap state (dismisses idle overlay) */
  wake: () => void;
  /** Checks if boost is currently on cooldown */
  isBoostOnCooldown: () => boolean; // Computed selector
}

const ENERGY_MAX = 100;
const ENERGY_DRAIN_RATE = 10;
const ENERGY_REFILL_RATE = 0.5;
const IDLE_THRESHOLD = 30000; // 30 seconds
const BOOST_COOLDOWN_MS = 10000; // 10 seconds
const BEAN_MAX = parseInt(process.env.NEXT_PUBLIC_NAPGPT_BEAN_MAX || "10", 10);
const BEAN_START = 3;

/**
 * Zustand store for NapGPT application state
 * 
 * Manages:
 * - Effort level (0-100) for response generation
 * - Energy level (0-100) that drains on send, refills when idle
 * - Boost cooldown (timestamp-based for reliability)
 * - Idle tracking for nap timer and blanket overlay
 * - Coffee bean economy for boost activation
 * - Blanket overlay state
 * 
 * All state updates are synchronous and atomic.
 * Persisted fields: beans, effort, energy.
 */
export const useNapStore = create<NapState>()(
  persist(
    (set, get) => ({
      effort: 50,
      energy: ENERGY_MAX,
      idleSince: null,
      isNapping: false,
      boostCooldown: 0,
      boostCooldownUntil: 0, // Timestamp when cooldown ends
      _boostIntervalId: null,
      napTimerEnabled: false,
      blanketOn: false,
      beans: BEAN_START,

      /**
       * Set effort level (0-100)
       * Automatically clamped to valid range
       */
      setEffort: (effort: number) => {
        set({ effort: Math.max(0, Math.min(100, effort)) });
      },

      /**
       * Consume energy (drains on message send)
       * @param amount - Energy to drain (defaults to ENERGY_DRAIN_RATE)
       */
      consumeEnergy: (amount: number = ENERGY_DRAIN_RATE) => {
        set((state) => ({
          energy: Math.max(0, state.energy - amount),
        }));
      },

      /**
       * Refill energy gradually when idle
       * Only refills if idle for at least 2 seconds
       */
      refillEnergy: () => {
        set((state) => {
          // Only refill when idle (no recent activity)
          // Consider idle if no activity in last 2 seconds
          const isIdle = state.idleSince !== null && (Date.now() - state.idleSince) > 2000;
          if (state.energy < ENERGY_MAX && isIdle) {
            return {
              energy: Math.min(ENERGY_MAX, state.energy + ENERGY_REFILL_RATE),
            };
          }
          return state;
        });
      },

      /**
       * Trigger boost (one-time use, adds 20 to effort for next message)
       * Uses timestamp-based cooldown for reliability
       * Requires coffee beans (checked in UI component)
       */
      triggerBoost: () => {
        const state = get();
        // Check if cooldown is still active using timestamp
        if (state.boostCooldownUntil > Date.now()) return;

        // Clear any existing interval before starting a new one
        if (state._boostIntervalId !== null) {
          clearInterval(state._boostIntervalId);
        }

        const now = Date.now();
        const cooldownEnd = now + BOOST_COOLDOWN_MS;

        const intervalId = setInterval(() => {
          const current = get();
          const remaining = Math.max(0, current.boostCooldownUntil - Date.now());

          if (remaining === 0) {
            clearInterval(intervalId);
            set({ boostCooldown: 0, boostCooldownUntil: 0, _boostIntervalId: null });
          } else {
            set({ boostCooldown: remaining });
          }
        }, 100);

        set({
          boostCooldown: BOOST_COOLDOWN_MS,
          boostCooldownUntil: cooldownEnd,
          _boostIntervalId: intervalId,
        });
      },

      isBoostOnCooldown: () => {
        const state = get();
        return state.boostCooldownUntil > Date.now();
      },

      toggleNapTimer: () => {
        set((state) => ({
          napTimerEnabled: !state.napTimerEnabled,
          isNapping: false,
          idleSince: null,
        }));
      },

      setNapping: (napping: boolean) => {
        set({ isNapping: napping });
      },

      updateIdle: () => {
        const state = get();
        if (!state.napTimerEnabled) {
          // Only update if state actually changes to avoid re-renders
          if (state.idleSince !== null || state.isNapping) {
            set({ idleSince: null, isNapping: false });
          }
          return;
        }

        const now = Date.now();
        if (state.idleSince === null) {
          set({ idleSince: now });
          return;
        }

        const idleTime = now - state.idleSince;
        if (idleTime > IDLE_THRESHOLD && !state.isNapping) {
          set({ isNapping: true });
        } else if (idleTime <= IDLE_THRESHOLD && state.isNapping) {
          set({ isNapping: false });
        }
      },

      wake: () => {
        set({ isNapping: false, idleSince: Date.now() });
      },

      toggleBlanket: () => {
        set((state) => ({ blanketOn: !state.blanketOn }));
      },

      spendBean: () => {
        const state = get();
        if (state.beans <= 0) {
          return false;
        }
        set({ beans: state.beans - 1 });
        return true;
      },

      earnBean: () => {
        set((state) => ({
          beans: Math.min(BEAN_MAX, state.beans + 1),
        }));
      },
    }),
    {
      name: 'nap-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        beans: state.beans,
        effort: state.effort,
        energy: state.energy,
        // Don't persist ephemeral state like isNapping, cooldowns, etc.
      }),
    }
  )
);

// Expose store for testing (dev/test only — Next.js eliminates this block in production builds)
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as any).__nap_store = useNapStore;
}

// Note: useNapStore.getState() is available for synchronous state access

