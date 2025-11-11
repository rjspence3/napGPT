/**
 * Dream Drift Test: Verify whimsical fragments are appended to replies
 */

import type { MCPClient } from "../utils/mcpClient";
import type { BrowserOps } from "../utils/browserOps";
import { createAssertions } from "../utils/assertions";
import config from "../config";

const DRIFT_FRAGMENTS = [
  "Then I drifted off and dreamt arrays sorted themselves…",
  "Somewhere a sleepy compiler hummed me a lullaby.",
  "I think a sheep whispered the answer first.",
  "Or maybe that was just a dream within a nap.",
];

export async function runDreamDriftTest(client: MCPClient): Promise<{
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

    // Test 1: Force drift probability to 1.0 via window.__nap_test
    await ops.evaluate(() => {
      (window as any).__nap_test = { dreamDriftProb: 1.0 };
    });
    notes.push("Set dream drift probability to 1.0");

    // Send two messages and check for drift fragments
    let driftCount = 0;
    for (let i = 0; i < 2; i++) {
      await ops.type(cfg.selectors.chatInput, `Test message ${i + 1}`);
      await ops.click(cfg.selectors.sendBtn);
      // Wait for response (with fallback)
      try {
        await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
      } catch {
        await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
      }
      await ops.waitForNetworkIdle(cfg.timeouts.medium);

      const responseText = await ops.getText(cfg.selectors.lastAssistantMsg);
      const hasDrift = DRIFT_FRAGMENTS.some((fragment) =>
        responseText.includes(fragment)
      );

      if (hasDrift) {
        driftCount++;
        notes.push(`Message ${i + 1} has drift fragment`);
      } else {
        notes.push(`Message ${i + 1} missing drift fragment: ${responseText.substring(0, 100)}`);
      }
    }

    assert.assertTrue(
      driftCount >= 1,
      `At least one message should have drift fragment (found ${driftCount}/2)`
    );
    notes.push(`Drift fragments found: ${driftCount}/2`);

    // Test 2: Reset probability to 0, send two messages, assert no drift
    await ops.evaluate(() => {
      (window as any).__nap_test = { dreamDriftProb: 0.0 };
    });
    notes.push("Set dream drift probability to 0.0");

    // Clear messages by reloading
    await client.goto(cfg.baseUrl);
    await ops.waitFor(cfg.selectors.chatInput, cfg.timeouts.short);

    // Set probability again after reload
    await ops.evaluate(() => {
      (window as any).__nap_test = { dreamDriftProb: 0.0 };
    });

    let noDriftCount = 0;
    for (let i = 0; i < 2; i++) {
      await ops.type(cfg.selectors.chatInput, `No drift test ${i + 1}`);
      await ops.click(cfg.selectors.sendBtn);
      // Wait for response (with fallback)
      try {
        await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
      } catch {
        await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
      }
      await ops.waitForNetworkIdle(cfg.timeouts.medium);

      const responseText = await ops.getText(cfg.selectors.lastAssistantMsg);
      const hasDrift = DRIFT_FRAGMENTS.some((fragment) =>
        responseText.includes(fragment)
      );

      if (!hasDrift) {
        noDriftCount++;
        notes.push(`Message ${i + 1} correctly has no drift`);
      } else {
        notes.push(`Message ${i + 1} incorrectly has drift: ${responseText.substring(0, 100)}`);
      }
    }

    assert.assertTrue(
      noDriftCount >= 1,
      `At least one message should have no drift fragment (found ${noDriftCount}/2)`
    );
    notes.push(`No drift fragments found: ${noDriftCount}/2`);

    // Cleanup: reset test config
    await ops.evaluate(() => {
      delete (window as any).__nap_test;
    });

    // Capture artifacts
    const artifactDir = `artifacts/${Date.now()}/55_dream_drift`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/metrics.json`, {
      driftCount,
      noDriftCount,
      fragments: DRIFT_FRAGMENTS,
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

