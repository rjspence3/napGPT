"use client";

import { motion } from "framer-motion";
import { useNapStore } from "@/lib/nap/state";
import { useEffect } from "react";

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

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-cozy-warm/30 rounded-full backdrop-blur-sm">
      <span className="text-xs text-cozy-dim font-medium">Energy</span>
      <div className="w-24 h-2 bg-cozy-amber/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cozy-amber to-cozy-rose rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
          data-testid="energy-meter-bar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <span className="text-xs text-cozy-dim font-medium w-8">{percentage}%</span>
    </div>
  );
}

