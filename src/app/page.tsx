"use client";

import { ChatWindow } from "@/components/ChatWindow";
import { EffortBar } from "@/components/EffortBar";
import { EnergyMeter } from "@/components/EnergyMeter";
import { IdleOverlay } from "@/components/IdleOverlay";
import { BlanketOverlay } from "@/components/BlanketOverlay";
import { initBlanketAuto } from "@/lib/nap/blanket";
import { initBeanTicker } from "@/lib/nap/coffee";
import { isDevelopmentMode } from "@/lib/utils/env";
import { useState, useEffect } from "react";

/**
 * Main application page
 * Composes the ChatWindow, EffortBar, and overlays.
 */
export default function Home() {
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    fetch("/api/mode")
      .then((res) => res.json())
      .then((data) => setIsMockMode(data.isMock))
      .catch((error) => {
        if (isDevelopmentMode()) {
          console.warn('[Home] Failed to fetch mode:', error);
        }
        setIsMockMode(false);
      });
  }, []);

  useEffect(() => {
    const cleanupBlanket = initBlanketAuto();
    const cleanupCoffee = initBeanTicker();
    return () => {
      cleanupBlanket();
      cleanupCoffee();
    };
  }, []);

  return (
    <main className="h-screen flex flex-col bg-cozy-latte">
      <header className="flex items-center justify-between px-6 py-4 bg-cozy-warm/30 backdrop-blur-sm border-b border-cozy-amber/20">
        <h1 className="text-2xl font-bold text-cozy-dim">NapGPT</h1>
        <EnergyMeter />
      </header>

      {isMockMode && (
        <div className="px-6 py-2 bg-cozy-amber/20 text-center text-sm text-cozy-dim" data-testid="mock-banner">
          Mock mode: no API key detected.
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>

      <footer className="px-6 py-4 bg-cozy-warm/30 backdrop-blur-sm border-t border-cozy-amber/20">
        <EffortBar />
      </footer>

      <IdleOverlay />
      <BlanketOverlay />
    </main>
  );
}

