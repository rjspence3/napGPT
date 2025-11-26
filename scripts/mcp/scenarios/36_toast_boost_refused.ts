/**
 * Toast Boost Refused Test: Verify toast appears when boost is clicked with 0 beans
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runToastBoostRefusedTest(client: MCPClient): Promise<{
  passed: boolean;
  duration: number;
  notes: string[];
}> {
  const startTime = Date.now();
  const notes: string[] = [];
  const assert = createAssertions();
  const { ops } = client;
  const cfg = config;

  try {
    // Page should already be loaded by test isolation
    notes.push("Page loaded");

    // Set beans to 0 via store manipulation
    await client.evaluate(() => {
      const store = (window as any).__nap_store;
      if (store) {
        store.setState({ beans: 0 });
      }
    });

    // Wait for UI to update
    const page = (client as any).page;
    if (page) {
      await page.waitForFunction(
        () => {
          const store = (window as any).__nap_store;
          if (!store) return false;
          return store.getState().beans === 0;
        },
        { timeout: 5000 }
      );
    } else {
      throw new Error("Page not available");
    }

    // Verify beans count shows 0
    await ops.waitFor(cfg.selectors.beansCount, cfg.timeouts.short);
    const beansText = await ops.getText(cfg.selectors.beansCount);
    const beans = parseInt(beansText.match(/\d+/)?.[0] || "0", 10);
    assert.assertTrue(beans === 0, "Beans should be 0");
    notes.push(`Beans count: ${beans}`);

    // Clear any cooldown to ensure button is clickable (but will be disabled due to 0 beans)
    await client.evaluate(() => {
      const store = (window as any).__nap_store;
      if (store) {
        store.setState({ boostCooldownUntil: 0, boostCooldown: 0 });
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Click boost button (should show toast even if disabled)
    // First check if button is disabled
    const isDisabled = await ops.isDisabled(cfg.selectors.boostBtn);
    if (!isDisabled) {
      // Button is enabled, click it
      await ops.click(cfg.selectors.boostBtn, { waitFor: 500 });
    } else {
      // Button is disabled, try to click anyway (some browsers allow this)
      try {
        await ops.click(cfg.selectors.boostBtn, { waitFor: 500 });
      } catch {
        // If click fails, trigger the click handler directly
        await client.evaluate(() => {
          const btn = document.querySelector('[data-testid="boost-btn"]') as HTMLElement;
          if (btn) {
            btn.click();
          }
        });
      }
    }

    // Wait for toast to appear using waitForFunction
    const toastVisible = await page.waitForFunction(
      (selector) => {
        const toast = document.querySelector(selector);
        if (!toast) return false;
        const style = window.getComputedStyle(toast);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          toast.textContent?.includes('Not enough coffee beans')
        );
      },
      { timeout: 5000 },
      cfg.selectors.toastBoostRefused || '[data-testid="toast-boost-refused"]'
    ).then(() => true).catch(() => false);

    assert.assertTrue(toastVisible, "Toast should appear when boost clicked with 0 beans");
    notes.push("Toast appeared");

    // Verify toast message
    const toastText = await ops.getText('[data-testid="toast-boost-refused"]');
    assert.assertTrue(
      toastText.includes("Not enough coffee beans") || toastText.includes("coffee beans"),
      "Toast should contain expected message"
    );
    notes.push(`Toast message: ${toastText}`);

    // Wait for toast to disappear (should be ≤ 3s, but wait up to 4s to be safe)
    const toastDisappeared = await page.waitForFunction(
      (selector) => {
        const toast = document.querySelector(selector);
        if (!toast) return true; // Already gone
        const style = window.getComputedStyle(toast);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      },
      { timeout: 4000 },
      '[data-testid="toast-boost-refused"]'
    ).then(() => true).catch(() => false);

    assert.assertTrue(toastDisappeared, "Toast should disappear within 3-4 seconds");
    notes.push("Toast disappeared");

    return {
      passed: assert.allPassed(),
      duration: Date.now() - startTime,
      notes,
    };
  } catch (error) {
    notes.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      passed: false,
      duration: Date.now() - startTime,
      notes,
    };
  }
}
