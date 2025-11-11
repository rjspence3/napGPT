/**
 * Coffee Economy Test: Verify bean currency system for Boost button
 */

import type { MCPClient } from "../utils/mcpClient";
import type { BrowserOps } from "../utils/browserOps";
import { createAssertions } from "../utils/assertions";
import config from "../config";

const BEAN_TICK_MS = parseInt(
  process.env.NEXT_PUBLIC_NAPGPT_BEAN_TICK_MS || "10000",
  10
);

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
    await client.goto(cfg.baseUrl);
    notes.push("Page loaded");

    // Test 1: Read initial bean count (expect >= 1)
    await ops.waitFor(cfg.selectors.beansCount, cfg.timeouts.short);
    const initialBeansText = await ops.getText(cfg.selectors.beansCount);
    const initialBeans = parseInt(initialBeansText.match(/\d+/)?.[0] || "0", 10);
    assert.assertTrue(initialBeans >= 1, "Should start with at least 1 bean");
    notes.push(`Initial beans: ${initialBeans}`);

    // Test 2: Click Boost repeatedly until beans are 0
    let beans = initialBeans;
    let boostClicks = 0;
    let lastBoostFailed = false;

    while (beans > 0 && boostClicks < 15) {
      // Wait for cooldown if needed
      const boostDisabled = await ops.isDisabled(cfg.selectors.boostBtn);
      if (boostDisabled) {
        notes.push(`Boost on cooldown, waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 11000)); // Wait for cooldown + buffer
      }

      const beansBefore = parseInt(
        (await ops.getText(cfg.selectors.beansCount)).match(/\d+/)?.[0] || "0",
        10
      );
      await ops.click(cfg.selectors.boostBtn);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for state update

      const beansAfter = parseInt(
        (await ops.getText(cfg.selectors.beansCount)).match(/\d+/)?.[0] || "0",
        10
      );

      if (beansBefore > 0 && beansAfter === beansBefore - 1) {
        beans = beansAfter;
        boostClicks++;
        notes.push(`Boost clicked, beans: ${beansBefore} → ${beansAfter}`);
      } else if (beansBefore === 0) {
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
          lastBoostFailed = true;
          break;
        }
      }
    }

    assert.assertTrue(
      beans === 0 || lastBoostFailed,
      "Should reach 0 beans or show refusal toast"
    );
    notes.push(`Final beans: ${beans}, Boost clicks: ${boostClicks}`);

    // Test 3: Wait idle for 20-30s → beans should increase
    // Ensure idle state is set and nap timer is enabled
    await client.evaluate(() => {
      const store = (window as any).__nap_store;
      if (store) {
        const state = store.getState();
        // Enable nap timer if not already enabled
        if (!state.napTimerEnabled) {
          state.toggleNapTimer();
        }
        // Set idle state
        if (state.idleSince === null) {
          state.updateIdle();
        }
      }
    });
    
    notes.push(`Waiting ${BEAN_TICK_MS * 3}ms for bean regeneration...`);
    // Wait for bean ticker to run (checks every BEAN_TICK_MS, so wait 3x + buffer)
    await new Promise((resolve) => setTimeout(resolve, BEAN_TICK_MS * 3 + 2000));

    const finalBeansText = await ops.getText(cfg.selectors.beansCount);
    const finalBeans = parseInt(finalBeansText.match(/\d+/)?.[0] || "0", 10);
    assert.assertTrue(
      finalBeans > beans,
      `Beans should increase after idle (was ${beans}, now ${finalBeans})`
    );
    notes.push(`Beans after idle: ${finalBeans} (increased from ${beans})`);

    // Capture artifacts
    const artifactDir = `artifacts/${Date.now()}/35_coffee_economy`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/metrics.json`, {
      beanTickMs: BEAN_TICK_MS,
      initialBeans,
      finalBeans,
      boostClicks,
      lastBoostFailed,
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

