"use client";

import { useNapStore } from "@/lib/nap/state";
import { Coffee, Moon } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Control bar for managing effort level
 * Displays effort slider, effort boost button, and coffee bean count.
 */
export function EffortBar() {
  const effort = useNapStore((state) => state.effort);
  const setEffort = useNapStore((state) => state.setEffort);
  const boostCooldown = useNapStore((state) => state.boostCooldown);
  const isBoostOnCooldown = useNapStore((state) => state.isBoostOnCooldown);
  const triggerBoost = useNapStore((state) => state.triggerBoost);
  const napTimerEnabled = useNapStore((state) => state.napTimerEnabled);
  const toggleNapTimer = useNapStore((state) => state.toggleNapTimer);
  const beans = useNapStore((state) => state.beans);
  const spendBean = useNapStore((state) => state.spendBean);

  const [localEffort, setLocalEffort] = useState(effort);
  const [displayCooldown, setDisplayCooldown] = useState(boostCooldown);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync local effort with store
  useEffect(() => {
    setLocalEffort(effort);
  }, [effort]);

  // Update display cooldown to show countdown
  useEffect(() => {
    setDisplayCooldown(boostCooldown);
    if (boostCooldown > 0) {
      const interval = setInterval(() => {
        setDisplayCooldown((prev) => Math.max(0, prev - 100));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [boostCooldown]);

  /**
   * Triggers a temporary effort level boost (NOT energy)
   * Consumes a coffee bean and initiates a cooldown
   */
  const handleBoost = async () => {
    // Double-check cooldown with fresh state to prevent race condition
    const state = useNapStore.getState();
    if (state.boostCooldownUntil > Date.now()) return;
    if (boostCooldown > 0) return;

    // Check if we have beans
    if (!spendBean()) {
      setToastMessage("Not enough coffee beans! Wait a bit and earn more.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    triggerBoost();

    // Set boost cookie via API
    try {
      await fetch("/api/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boost: 20 }),
      });
    } catch (error) {
      console.error("Failed to set boost:", error);
    }
  };

  /**
   * Updates the global effort state
   * @param value - New effort level (0-100)
   */
  const handleEffortChange = (value: number) => {
    setLocalEffort(value);
    setEffort(value);
  };

  // Use isBoostOnCooldown() for authoritative disabled check (timestamp-based)
  // Keep displayCooldown for seconds display only
  const boostDisabled = isBoostOnCooldown();
  const boostSeconds = Math.ceil(displayCooldown / 1000);

  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-cozy-warm/50 backdrop-blur-sm rounded-2xl cozy-shadow relative">
      {toastMessage && (
        <div
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-cozy-dim text-cozy-latte rounded-lg text-sm shadow-lg z-50"
          role="alert"
          aria-live="polite"
          data-testid="toast-boost-refused"
        >
          {toastMessage}
        </div>
      )}
      <div className="flex-1">
        <label className="block text-xs text-cozy-dim mb-1 font-medium">
          Effort Level: {localEffort}
          <span className="ml-2 font-normal opacity-60">
            {localEffort >= 70 ? "— actually trying" : localEffort >= 35 ? "— meh, fine" : "— please don't make me"}
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={localEffort}
          onChange={(e) => handleEffortChange(Number(e.target.value))}
          className="w-full h-2 bg-cozy-amber/20 rounded-lg appearance-none cursor-pointer accent-cozy-amber"
          aria-label="Effort Level"
          title="Drag to change how hard NapGPT tries. Higher effort = more helpful responses."
          data-testid="effort-slider"
        />
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-xs text-cozy-dim font-medium cursor-help"
          data-testid="beans-count"
          aria-label={`${beans} coffee beans`}
          title="Coffee beans earned by being idle. Spend them to boost effort!"
        >
          ☕ {beans}
        </span>
        <button
          onClick={handleBoost}
          disabled={boostDisabled || beans === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
            transition-all duration-200
            ${boostDisabled || beans === 0
              ? "bg-cozy-amber/20 text-cozy-dim/50 cursor-not-allowed"
              : "bg-cozy-amber text-cozy-dim hover:bg-cozy-amber/90 active:scale-95"
            }
          `}
          aria-label="Spend a coffee bean to temporarily boost effort level"
          title="Spend ☕ to boost effort"
          data-testid="boost-btn"
        >
          <Coffee size={16} />
          {boostDisabled ? `${boostSeconds}s` : "Effort+"}
        </button>
      </div>

      <button
        onClick={toggleNapTimer}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
          transition-all duration-200
          ${napTimerEnabled
            ? "bg-cozy-rose text-cozy-dim hover:bg-cozy-rose/90"
            : "bg-cozy-amber/30 text-cozy-dim hover:bg-cozy-amber/40"
          }
          active:scale-95
        `}
        aria-label="Toggle nap timer"
        title="When enabled, NapGPT will doze off if you're idle too long. Click the overlay to wake it!"
        data-testid="nap-toggle"
      >
        <Moon size={16} />
        Nap Timer
      </button>
    </div>
  );
}

