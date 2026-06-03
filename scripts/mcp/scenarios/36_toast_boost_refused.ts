/**
 * Boost-refused-at-zero-beans test: with 0 beans the Boost button is disabled,
 * so a boost cannot be triggered. Verifies the button is non-interactive and
 * that attempting to click it does not start a boost or its cooldown.
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

    // Set beans to 0 and clear any cooldown so the only thing gating the
    // button is the empty bean balance.
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

    // With 0 beans the boost button must be disabled (no beans to spend).
    const isDisabled = await ops.isDisabled(cfg.selectors.boostBtn);
    assert.assertTrue(isDisabled, "Boost button should be disabled when beans are 0");
    notes.push("Boost button disabled at 0 beans");

    // Attempt to click anyway and confirm it is a no-op: no boost is triggered
    // and no cooldown is started.
    try {
      await ops.click(cfg.selectors.boostBtn, { waitFor: 500 });
    } catch {
      // A disabled button may reject the click entirely — that is the expected path.
    }

    const stateAfter = await client.evaluate(() => {
      const store = (window as any).__nap_store;
      const s = store ? store.getState() : null;
      return s ? { beans: s.beans, boostCooldownUntil: s.boostCooldownUntil } : null;
    });

    assert.assertTrue(!!stateAfter, "Store should be available");
    assert.assertTrue(stateAfter!.beans === 0, "Beans should remain 0 after clicking disabled button");
    assert.assertTrue(
      !stateAfter!.boostCooldownUntil || stateAfter!.boostCooldownUntil <= Date.now(),
      "No boost cooldown should start when the button is disabled"
    );
    notes.push("Click was a no-op: no boost, no cooldown");

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
