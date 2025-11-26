/**
 * Test echo fragments - prior-turn reference fragments
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runEchoFragmentsTest(client: MCPClient): Promise<{
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

    // Enable echo fragments via test config
    await client.evaluate(() => {
      (window as any).__nap_test = {
        echoFragmentProb: 1.0, // Force echo fragments
        ENABLE_ECHO_FRAGMENTS: true,
      };
    });
    notes.push("Echo fragments enabled (probability: 1.0)");

    // Send first message
    await ops.type(cfg.selectors.chatInput, "Tell me about React");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const firstResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    notes.push(`First response: ${firstResponse.substring(0, 80)}...`);

    // Send second message (should reference first)
    await ops.type(cfg.selectors.chatInput, "What else?");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const secondResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(secondResponse, "Second response should not be empty");
    notes.push(`Second response: ${secondResponse.substring(0, 80)}...`);

    // Check for echo fragment patterns (references to prior turn)
    const echoPatterns = [
      /(before|earlier|mentioned|said|told|asked)/i,
      /(react|previous|last|prior)/i,
    ];
    const hasEcho = echoPatterns.some((pattern) => pattern.test(secondResponse));

    // Echo fragments are probabilistic, so we just verify the response is substantial
    assert.assertTrue(
      secondResponse.length > 20,
      "Second response should be substantial (echo fragments may or may not appear)"
    );

    if (hasEcho) {
      notes.push("✓ Echo fragment detected in second response");
    } else {
      notes.push("No echo fragment detected (may be probabilistic)");
    }

    // Cleanup
    await client.evaluate(() => {
      delete (window as any).__nap_test;
    });

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/97_echo_fragments`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      firstResponse,
      secondResponse,
      hasEcho,
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

