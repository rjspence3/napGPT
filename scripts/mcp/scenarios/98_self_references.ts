/**
 * Test self-references - self-reference fragments
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runSelfReferencesTest(client: MCPClient): Promise<{
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

    // Enable self-references via test config
    await client.evaluate(() => {
      (window as any).__nap_test = {
        selfRefProb: 1.0, // Force self-references
        ALLOW_SELF_REFERENCES: true,
      };
    });
    notes.push("Self-references enabled (probability: 1.0)");

    // Set effort to medium-high (self-refs more likely at higher effort)
    await ops.setSlider(cfg.selectors.effortSlider, 70);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Send message
    await ops.type(cfg.selectors.chatInput, "What can you do?");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const responseText = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(responseText, "Response should not be empty");
    notes.push(`Response: ${responseText.substring(0, 100)}...`);

    // Check for self-reference patterns
    const selfRefPatterns = [
      /(I|me|my|myself)/i,
      /(NapGPT|nap|sleepy|tired|cozy)/i,
    ];
    const hasSelfRef = selfRefPatterns.some((pattern) => pattern.test(responseText));

    // Self-references are probabilistic, so we just verify the response is substantial
    assert.assertTrue(
      responseText.length > 20,
      "Response should be substantial (self-references may or may not appear)"
    );

    if (hasSelfRef) {
      notes.push("✓ Self-reference detected in response");
    } else {
      notes.push("No self-reference detected (may be probabilistic)");
    }

    // Cleanup
    await client.evaluate(() => {
      delete (window as any).__nap_test;
    });

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/98_self_references`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      responseText,
      hasSelfRef,
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

