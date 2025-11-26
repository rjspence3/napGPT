"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNapStore } from "@/lib/nap/state";

export function BlanketOverlay() {
  const blanketOn = useNapStore((state) => state.blanketOn);
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {blanketOn && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          aria-hidden="true"
          data-testid="blanket-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.15) 0%, rgba(245, 230, 211, 0.25) 50%, rgba(42, 31, 26, 0.35) 100%)`,
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(212, 165, 116, 0.03) 2px,
                rgba(212, 165, 116, 0.03) 4px
              )`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

