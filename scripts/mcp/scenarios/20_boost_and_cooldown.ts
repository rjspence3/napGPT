/**
 * Test boost button and cooldown mechanism
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runBoostAndCooldownTest(client: MCPClient): Promise<{
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
    // Set effort to 40
    await ops.setSlider(cfg.selectors.effortSlider, 40);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify boost button is enabled
    const boostEnabledBefore = !(await ops.isDisabled(cfg.selectors.boostBtn));
    assert.assertTrue(boostEnabledBefore, "Boost button should be enabled initially");
    notes.push("Boost button enabled initially");

    // Click boost button
    await ops.click(cfg.selectors.boostBtn, { waitFor: 500 });

    // Wait for Zustand state to update - check store directly
    // Wait for Zustand state to update - check store directly
    const page = (client as any).page;
    if (page) {
      await page.waitForFunction(() => {
        const store = (window as any).__nap_store;
        if (!store) return false;
        const state = store.getState();
        return state.boostCooldown > 0 || (state as any).boostCooldownUntil > Date.now();
      }, { timeout: 5000 });
    } else {
      // Fallback for non-puppeteer (if any)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Wait for React to update DOM
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify boost button is now disabled (cooldown) using waitForFunction
    // First wait for Zustand state to have cooldown active
    if (page) {
      // Wait for Zustand store to have cooldown active
      await page.waitForFunction(
        () => {
          const store = (window as any).__nap_store;
          if (!store) return false;
          const state = store.getState();
          return state.boostCooldown > 0 || (state as any).boostCooldownUntil > Date.now();
        },
        { timeout: 10000 }
      );

      // Then wait for button to be disabled in DOM
      await page.waitForFunction(
        (selector: string) => {
          const el = document.querySelector(selector) as HTMLElement;
          return el ? (el as any).disabled || el.getAttribute("aria-disabled") === "true" : false;
        },
        { timeout: 10000 },
        cfg.selectors.boostBtn
      );
    }

    const boostDisabledAfter = await ops.isDisabled(cfg.selectors.boostBtn);
    assert.assertTrue(boostDisabledAfter, "Boost button should be disabled during cooldown");
    notes.push("Boost button disabled after click (cooldown active)");

    // Send a message immediately after boost
    await ops.type(cfg.selectors.chatInput, "Explain closures briefly");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Check boost button immediately after message (cooldown should still be active)
    // Cooldown is 10 seconds, and we just clicked boost, so it should still be disabled
    await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for React to update
    const stillDisabled = await ops.isDisabled(cfg.selectors.boostBtn);
    assert.assertTrue(stillDisabled, "Boost button should remain disabled during cooldown (10s cooldown, just started)");
    notes.push("Boost button still disabled (cooldown active)");

    // Wait for response (with fallback)
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    // Get response
    const responseText = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(responseText, "Response should not be empty");
    notes.push(`Response received: ${responseText.length} chars`);

    // Verify cooldown is actually active by checking the button state again after a short delay
    // Note: We skip this check if response took too long (cooldown might have expired)
    if (Date.now() - startTime < 10000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const stillDisabledAfterDelay = await ops.isDisabled(cfg.selectors.boostBtn);
      assert.assertTrue(stillDisabledAfterDelay, "Boost button should remain disabled after 1.5s (cooldown is 10s)");
      notes.push("Boost button still disabled after 1.5s delay");
    } else {
      notes.push("Skipping final cooldown check (response took too long)");
    }

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/20_boost_and_cooldown`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);

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


