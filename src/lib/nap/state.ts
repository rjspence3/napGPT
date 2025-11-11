import { create } from "zustand";

export type BlanketState = {
  blanketOn: boolean;
  toggleBlanket: () => void;
};

export type CoffeeState = {
  beans: number;
  spendBean: () => boolean;
  earnBean: () => void;
};

interface NapState extends BlanketState, CoffeeState {
  effort: number;
  energy: number;
  idleSince: number | null;
  isNapping: boolean;
  boostCooldown: number;
  napTimerEnabled: boolean;
  setEffort: (effort: number) => void;
  consumeEnergy: (amount: number) => void;
  refillEnergy: () => void;
  triggerBoost: () => void;
  toggleNapTimer: () => void;
  setNapping: (napping: boolean) => void;
  updateIdle: () => void;
}

const ENERGY_MAX = 100;
const ENERGY_DRAIN_RATE = 10;
const ENERGY_REFILL_RATE = 0.5;
const IDLE_THRESHOLD = 30000; // 30 seconds
const BOOST_COOLDOWN_MS = 10000; // 10 seconds
const BEAN_MAX = parseInt(process.env.NEXT_PUBLIC_NAPGPT_BEAN_MAX || "10", 10);
const BEAN_START = 3;

export const useNapStore = create<NapState>((set, get) => ({
  effort: 50,
  energy: ENERGY_MAX,
  idleSince: null,
  isNapping: false,
  boostCooldown: 0,
  napTimerEnabled: false,
  blanketOn: false,
  beans: BEAN_START,

  setEffort: (effort: number) => {
    set({ effort: Math.max(0, Math.min(100, effort)) });
  },

  consumeEnergy: (amount: number = ENERGY_DRAIN_RATE) => {
    set((state) => ({
      energy: Math.max(0, state.energy - amount),
    }));
  },

  refillEnergy: () => {
    set((state) => {
      if (state.energy < ENERGY_MAX) {
        return {
          energy: Math.min(ENERGY_MAX, state.energy + ENERGY_REFILL_RATE),
        };
      }
      return state;
    });
  },

  triggerBoost: () => {
    const state = get();
    if (state.boostCooldown > 0) return;

    set({ boostCooldown: BOOST_COOLDOWN_MS });

    // Decrement cooldown every 100ms
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, BOOST_COOLDOWN_MS - elapsed);
      
      if (remaining === 0) {
        clearInterval(interval);
        set({ boostCooldown: 0 });
      } else {
        set({ boostCooldown: remaining });
      }
    }, 100);
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
      set({ idleSince: null, isNapping: false });
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
}));

// Expose store for testing
if (typeof window !== 'undefined') {
  (window as any).__nap_store = useNapStore;
}

// Note: useNapStore.getState() is available for synchronous state access

