"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNapStore } from "@/lib/nap/state";

export function IdleOverlay() {
  const isNapping = useNapStore((state) => state.isNapping);
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isNapping && (
        <motion.div
          className="fixed inset-0 bg-cozy-dim/60 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

