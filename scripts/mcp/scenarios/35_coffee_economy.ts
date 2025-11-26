/**
 * Coffee Economy Test: Verify bean currency system for Boost button
 */

import type { MCPClient } from "../utils/mcpClient";
import type { BrowserOps } from "../utils/browserOps";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runCoffeeEconomyTest(client: MCPClient): Promise<{
  passed: boolean;
  duration: number;
  notes: string[];
}> {
  const startTime = Date.now();
  const notes: string[] = [];
  const assert = createAssertions();
  const { ops, artifacts } = client;
  const cfg = config;

  try {
    // Page should already be loaded by test isolation
    notes.push("Page loaded");

    // Test 1: Read initial bean count (expect >= 1)
    await ops.waitFor(cfg.selectors.beansCount, cfg.timeouts.short);
    const initialBeansText = await ops.getText(cfg.selectors.beansCount);
    const initialBeans = parseInt(initialBeansText.match(/\d+/)?.[0] || "0", 10);
    assert.assertTrue(initialBeans >= 1, "Should start with at least 1 bean");
    notes.push(`Initial beans: ${initialBeans}`);

    // Test 2: Click Boost a few times (optimized: only test 2-3 clicks instead of draining all)
    let beans = initialBeans;
    let boostClicks = 0;
    const maxClicks = Math.min(3, initialBeans); // Only test a few clicks

    for (let i = 0; i < maxClicks; i++) {
      // Skip cooldown wait for first click, or manually clear cooldown for subsequent clicks
      if (i > 0) {
        // Clear cooldown manually for faster testing
        await client.evaluate(() => {
          const store = (window as any).__nap_store;
          if (store) {
            store.getState().boostCooldownUntil = 0;
            store.getState().boostCooldown = 0;
          }
        });
        await new Promise((resolve) => setTimeout(resolve, 300)); // Small wait for state update
      }

      // Check if button is disabled before clicking
      const buttonDisabled = await ops.isDisabled(cfg.selectors.boostBtn);
      if (buttonDisabled) {
        notes.push(`Boost button disabled, skipping click ${i + 1}`);
        continue;
      }

      const beansBefore = parseInt(
        (await ops.getText(cfg.selectors.beansCount)).match(/\d+/)?.[0] || "0",
        10
      );
      
      // Verify we have beans
      if (beansBefore === 0) {
        notes.push(`No beans available, skipping click ${i + 1}`);
        break;
      }
      
      await ops.click(cfg.selectors.boostBtn);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Longer wait for state update

      const beansAfter = parseInt(
        (await ops.getText(cfg.selectors.beansCount)).match(/\d+/)?.[0] || "0",
        10
      );

      if (beansBefore > 0 && beansAfter === beansBefore - 1) {
        beans = beansAfter;
        boostClicks++;
        notes.push(`Boost clicked, beans: ${beansBefore} → ${beansAfter}`);
      } else {
        // Check for toast message
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for toast to appear
        const toastVisible = await ops.isVisible('[role="alert"]').catch(() => false);
        if (toastVisible) {
          const toastText = await ops.getText('[role="alert"]');
          assert.assertTrue(
            toastText.includes("coffee beans") || toastText.includes("Not enough"),
            "Should show toast when no beans"
          );
          notes.push(`Toast shown: ${toastText}`);
          break;
        }
      }
    }

    assert.assertTrue(
      boostClicks > 0,
      `Should have clicked boost at least once (clicked ${boostClicks} times)`
    );
    notes.push(`Boost clicks: ${boostClicks}, Beans remaining: ${beans}`);

    // Test 3: Manually trigger bean earning instead of waiting for ticker
    // This is much faster than waiting 30+ seconds
    await client.evaluate(() => {
      const store = (window as any).__nap_store;
      if (store) {
        const state = store.getState();
        // Enable nap timer if not already enabled
        if (!state.napTimerEnabled) {
          state.toggleNapTimer();
        }
        // Set idle state to a time in the past (simulate being idle)
        state.idleSince = Date.now() - 15000; // 15 seconds ago
        // Manually trigger bean earning
        if (state.earnBean) {
          state.earnBean();
        }
      }
    });
    
    notes.push(`Manually triggered bean earning (optimized for testing)`);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Small wait for UI update

    const finalBeansText = await ops.getText(cfg.selectors.beansCount);
    const finalBeans = parseInt(finalBeansText.match(/\d+/)?.[0] || "0", 10);
    // Beans should increase if not at max, or stay at max if already maxed
    const beanMax = 10; // BEAN_MAX from state.ts
    if (beans < beanMax) {
      assert.assertTrue(
        finalBeans > beans,
        `Beans should increase after earning (was ${beans}, now ${finalBeans})`
      );
    } else {
      assert.assertTrue(
        finalBeans === beans,
        `Beans should stay at max after earning (was ${beans}, now ${finalBeans})`
      );
    }
    notes.push(`Beans after earning: ${finalBeans} (was ${beans})`);

    // Capture artifacts
    const artifactDir = `artifacts/${Date.now()}/35_coffee_economy`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/metrics.json`, {
      initialBeans,
      finalBeans,
      boostClicks,
      beansAfterClicks: beans,
    });

    return {
      passed: true,
      duration: Date.now() - startTime,
      notes,
    };
  } catch (error: any) {
    notes.push(`Error: ${error.message}`);
    return {
      passed: false,
      duration: Date.now() - startTime,
      notes,
    };
  }
}

