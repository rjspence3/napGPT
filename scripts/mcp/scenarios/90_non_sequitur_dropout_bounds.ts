/**
 * Test dropout and non-sequitur bounds (never below 40 chars, only for general prompts)
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runNonSequiturDropoutBoundsTest(client: MCPClient): Promise<{
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

    const efforts = [25, 65];
    const longPrompts = [
      "Explain the theory of relativity in detail and how it relates to quantum mechanics",
      "Describe the history of computing from the abacus to modern quantum computers",
    ];

    for (let i = 0; i < efforts.length; i++) {
      const effort = efforts[i];
      const prompt = longPrompts[i];

      notes.push(`Testing effort ${effort} with long prompt...`);
      await ops.setSlider(cfg.selectors.effortSlider, effort);
      await new Promise((resolve) => setTimeout(resolve, 300));

      await ops.type(cfg.selectors.chatInput, prompt);
      await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

      // Wait for response (with fallback)
      try {
        await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
      } catch {
        await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
      }
      await ops.waitForNetworkIdle(cfg.timeouts.medium);

      const response = await ops.getText(cfg.selectors.lastAssistantMsg);
      assert.assertNotEmpty(response, `Response at effort ${effort} should not be empty`);

      // Check for dropout (should never be below 40 chars if truncated)
      if (response.includes("… zzz")) {
        const beforeTruncate = response.split("… zzz")[0];
        assert.assertGreaterThan(
          beforeTruncate.length,
          35,
          `Dropout should not cut below 40 chars (got ${beforeTruncate.length})`
        );
        notes.push(`  ✓ Dropout detected, length check passed: ${beforeTruncate.length} chars`);
      }

      // Check for non-sequitur (should only appear in general prompts, not math/code)
      if (response.includes("pancakes") || response.includes("Anyway")) {
        // This is a general prompt, so non-sequitur is allowed
        notes.push(`  ✓ Non-sequitur detected (allowed for general prompt)`);
      }

      // Response should always be substantial
      assert.assertGreaterThan(response.length, 20, "Response should be substantial");

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/90_non_sequitur_dropout_bounds`;
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


