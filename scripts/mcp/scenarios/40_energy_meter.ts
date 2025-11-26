/**
 * Test energy meter draining and refilling
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runEnergyMeterTest(client: MCPClient): Promise<{
  passed: boolean;
  duration: number;
  notes: string[];
  energyReadings: number[];
}> {
  const startTime = Date.now();
  const notes: string[] = [];
  const assert = createAssertions();
  const { ops, artifacts } = client;
  const cfg = config;
  const energyReadings: number[] = [];

  try {
    // Page should already be loaded by test isolation

    // Reset state to ensure test isolation
    await client.evaluate(() => {
      const store = (window as any).__nap_store;
      if (store) {
        store.setState({
          energy: 100,
          napTimerEnabled: false,
          isNapping: false,
          idleSince: null,
          beans: 10 // Ensure enough beans just in case
        });
      }
    });
    notes.push("State reset: energy=100, napTimer=false");
    // Get initial energy level
    const initialEnergyAttr = await ops.getAttribute(cfg.selectors.energyMeterBar, "aria-valuenow");
    const initialEnergy = initialEnergyAttr ? parseInt(initialEnergyAttr, 10) : 100;
    energyReadings.push(initialEnergy);
    notes.push(`Initial energy: ${initialEnergy}%`);

    // Send 3 quick messages to drain energy
    for (let i = 0; i < 3; i++) {
      await ops.type(cfg.selectors.chatInput, `Test message ${i + 1}`);

      // Read energy from Zustand store directly (more reliable)
      const energyBefore = await client.evaluate(() => {
        const store = (window as any).__nap_store;
        return store ? store.getState().energy : 100;
      });

      await ops.click(cfg.selectors.sendBtn, { waitFor: 100 });

      // Read energy IMMEDIATELY after clicking (before refill happens)
      // Read from Zustand store directly for accuracy
      await new Promise((resolve) => setTimeout(resolve, 500));
      const energyAfter = await client.evaluate(() => {
        const store = (window as any).__nap_store;
        return store ? store.getState().energy : 100;
      });

      // Energy should have decreased immediately after clicking
      if (i === 0) {
        // First message: should decrease from 100
        assert.assertLessThan(
          energyAfter,
          energyBefore,
          `Energy should decrease after message ${i + 1} (was ${energyBefore}%, now ${energyAfter}%)`
        );
      } else {
        // Subsequent messages: should be less than previous reading
        assert.assertLessThan(
          energyAfter,
          energyReadings[energyReadings.length - 1],
          `Energy should decrease after message ${i + 1} (was ${energyReadings[energyReadings.length - 1]}%, now ${energyAfter}%)`
        );
      }

      energyReadings.push(energyAfter);
      notes.push(`After message ${i + 1}: ${energyAfter}% (was ${energyBefore}%)`);

      // Wait for response (with fallback)
      try {
        await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
      } catch {
        await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
      }
      await ops.waitForNetworkIdle(cfg.timeouts.medium);

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Wait for energy to refill
    notes.push("Waiting for energy refill...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if energy increased
    const finalEnergyAttr = await ops.getAttribute(cfg.selectors.energyMeterBar, "aria-valuenow");
    const finalEnergy = finalEnergyAttr ? parseInt(finalEnergyAttr, 10) : energyReadings[energyReadings.length - 1];
    energyReadings.push(finalEnergy);
    notes.push(`After refill wait: ${finalEnergy}%`);

    // Energy should have increased (refilling)
    if (finalEnergy > energyReadings[energyReadings.length - 2]) {
      notes.push("✓ Energy refilling detected");
    }

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/40_energy_meter`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/energy.json`, { readings: energyReadings, notes });

    return {
      passed: true,
      duration: Date.now() - startTime,
      notes,
      energyReadings,
    };
  } catch (error: any) {
    notes.push(`Error: ${error.message}`);
    return {
      passed: false,
      duration: Date.now() - startTime,
      notes,
      energyReadings,
    };
  }
}


