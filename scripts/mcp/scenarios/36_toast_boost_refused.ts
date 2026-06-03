/**
 * Boost-refused toast test: with 0 beans the Boost button stays clickable, and
 * clicking it surfaces the "Not enough coffee beans" toast instead of boosting.
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
    notes.push("Page loaded");

    // Set beans to 0 and clear any cooldown so the button is interactive and the
    // only reason a boost is refused is the empty bean balance.
    await client.evaluate(() => {
      const store = (window as any).__nap_store;
      if (store) {
        store.setState({ beans: 0, boostCooldownUntil: 0, boostCooldown: 0 });
      }
    });

    const page = (client as any).page;
    if (!page) throw new Error("Page not available");

    await page.waitForFunction(
      () => {
        const store = (window as any).__nap_store;
        return !!store && store.getState().beans === 0;
      },
      { timeout: 5000 }
    );

    // Verify beans count shows 0
    await ops.waitFor(cfg.selectors.beansCount, cfg.timeouts.short);
    const beansText = await ops.getText(cfg.selectors.beansCount);
    const beans = parseInt(beansText.match(/\d+/)?.[0] || "0", 10);
    assert.assertTrue(beans === 0, "Beans should be 0");
    notes.push(`Beans count: ${beans}`);

    // The button must remain clickable at 0 beans so the refusal toast can fire.
    const isDisabled = await ops.isDisabled(cfg.selectors.boostBtn);
    assert.assertFalse(isDisabled, "Boost button should be clickable at 0 beans (not disabled)");
    await ops.click(cfg.selectors.boostBtn, { waitFor: 300 });

    // Toast should appear with the refusal message.
    const toastSelector = cfg.selectors.toastBoostRefused || '[data-testid="toast-boost-refused"]';
    const toastVisible = await page.waitForFunction(
      (selector: string) => {
        const toast = document.querySelector(selector);
        if (!toast) return false;
        const style = window.getComputedStyle(toast);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          !!toast.textContent?.includes('coffee beans')
        );
      },
      { timeout: 5000 },
      toastSelector
    ).then(() => true).catch(() => false);

    assert.assertTrue(toastVisible, "Toast should appear when boost clicked with 0 beans");
    const toastText = await ops.getText(toastSelector);
    assert.assertTrue(
      toastText.includes("coffee beans"),
      `Toast should mention coffee beans (got: ${toastText})`
    );
    notes.push(`Toast shown: ${toastText}`);

    // Clicking with 0 beans must not have spent a (non-existent) bean or boosted.
    const stateAfter = await client.evaluate(() => {
      const store = (window as any).__nap_store;
      const s = store ? store.getState() : null;
      return s ? { beans: s.beans, boostCooldownUntil: s.boostCooldownUntil } : null;
    });
    assert.assertTrue(!!stateAfter && stateAfter.beans === 0, "Beans should remain 0");
    assert.assertTrue(
      !stateAfter!.boostCooldownUntil || stateAfter!.boostCooldownUntil <= Date.now(),
      "No boost cooldown should start when refused for lack of beans"
    );

    // Toast should auto-dismiss within a few seconds.
    const toastDismissed = await page.waitForFunction(
      (selector: string) => {
        const toast = document.querySelector(selector);
        if (!toast) return true;
        const style = window.getComputedStyle(toast);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      },
      { timeout: 5000 },
      toastSelector
    ).then(() => true).catch(() => false);
    assert.assertTrue(toastDismissed, "Toast should auto-dismiss");
    notes.push("Toast auto-dismissed");

    // Reaching here means every assertion above passed (they throw on failure).
    return {
      passed: true,
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
