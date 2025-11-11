"use client";

import { useNapStore } from "@/lib/nap/state";
import { Coffee, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export function EffortBar() {
  const effort = useNapStore((state) => state.effort);
  const setEffort = useNapStore((state) => state.setEffort);
  const boostCooldown = useNapStore((state) => state.boostCooldown);
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

  const handleBoost = async () => {
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

  const handleEffortChange = (value: number) => {
    setLocalEffort(value);
    setEffort(value);
  };

  // Use boostCooldown directly for disabled check (immediate sync)
  // Keep displayCooldown for seconds display only
  const boostDisabled = boostCooldown > 0;
  const boostSeconds = Math.ceil(displayCooldown / 1000);

  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-cozy-warm/50 backdrop-blur-sm rounded-2xl cozy-shadow relative">
      {toastMessage && (
        <div
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-cozy-dim text-cozy-latte rounded-lg text-sm shadow-lg z-50"
          role="alert"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
      <div className="flex-1">
        <label className="block text-xs text-cozy-dim mb-2 font-medium">
          Effort Level: {localEffort}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={localEffort}
          onChange={(e) => handleEffortChange(Number(e.target.value))}
          className="w-full h-2 bg-cozy-amber/20 rounded-lg appearance-none cursor-pointer accent-cozy-amber"
          aria-label="Effort Level"
          data-testid="effort-slider"
        />
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-xs text-cozy-dim font-medium"
          data-testid="beans-count"
          aria-label={`${beans} coffee beans`}
        >
          ☕ {beans}
        </span>
        <button
          onClick={handleBoost}
          disabled={boostDisabled || beans === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
            transition-all duration-200
            ${
              boostDisabled || beans === 0
                ? "bg-cozy-amber/20 text-cozy-dim/50 cursor-not-allowed"
                : "bg-cozy-amber text-cozy-dim hover:bg-cozy-amber/90 active:scale-95"
            }
          `}
          aria-label="Boost energy"
          data-testid="boost-btn"
        >
          <Coffee size={16} />
          {boostDisabled ? `${boostSeconds}s` : "Boost"}
        </button>
      </div>

      <button
        onClick={toggleNapTimer}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
          transition-all duration-200
          ${
            napTimerEnabled
              ? "bg-cozy-rose text-cozy-dim hover:bg-cozy-rose/90"
              : "bg-cozy-amber/30 text-cozy-dim hover:bg-cozy-amber/40"
          }
          active:scale-95
        `}
        aria-label="Toggle nap timer"
        data-testid="nap-toggle"
      >
        <Moon size={16} />
        Nap Timer
      </button>
    </div>
  );
}

