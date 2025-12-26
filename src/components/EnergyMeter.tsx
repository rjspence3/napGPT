"use client";

import { motion } from "framer-motion";
import { useNapStore } from "@/lib/nap/state";
import { useEffect } from "react";

/**
 * Displays the current energy level
 * Updates automatically via the store and refills over time.
 * Shows warning state when depleted (0 energy).
 */
export function EnergyMeter() {
  const energy = useNapStore((state) => state.energy);
  const refillEnergy = useNapStore((state) => state.refillEnergy);

  useEffect(() => {
    const interval = setInterval(() => {
      refillEnergy();
    }, 100);

    return () => clearInterval(interval);
  }, [refillEnergy]);

  const percentage = Math.round(energy);
  const isDepleted = percentage === 0;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm cursor-help ${isDepleted ? "bg-red-900/30" : "bg-cozy-warm/30"}`}
      title="Energy drains when you send messages. Stay idle to recharge!"
      data-testid="energy-meter"
    >
      <span className={`text-xs font-medium ${isDepleted ? "text-red-400" : "text-cozy-dim"}`}>
        {isDepleted ? "💤 Tired" : "Energy"}
      </span>
      <div className="w-24 h-2 bg-cozy-amber/20 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isDepleted ? "bg-red-500" : "bg-gradient-to-r from-cozy-amber to-cozy-rose"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percentage, 2)}%` }}
          transition={{ duration: 0.3 }}
          data-testid="energy-meter-bar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={`Energy level: ${percentage}%`}
        />
      </div>
      <span className={`text-xs font-medium w-8 ${isDepleted ? "text-red-400" : "text-cozy-dim"}`}>
        {percentage}%
      </span>
    </div>
  );
}

