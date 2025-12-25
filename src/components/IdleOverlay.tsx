"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNapStore } from "@/lib/nap/state";

/**
 * Overlay shown when the user has been idle for too long and the nap timer is enabled.
 * Displays a sleeping animation. Click anywhere to wake.
 */
export function IdleOverlay() {
  const isNapping = useNapStore((state) => state.isNapping);
  const wake = useNapStore((state) => state.wake);
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isNapping && (
        <motion.div
          className="fixed inset-0 bg-cozy-dim/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
          onClick={wake}
          role="button"
          aria-label="Click to wake"
          data-testid="idle-overlay"
        >
          <motion.div
            className="text-6xl text-cozy-latte font-bold"
            animate={{
              y: [0, -20, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Zzz...
          </motion.div>
          <p className="mt-4 text-cozy-latte/70 text-sm">Click to wake</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

