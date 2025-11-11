/**
 * Test /dream and /nap commands
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runCommandsDreamNapTest(client: MCPClient): Promise<{
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

    // Test /dream command
    notes.push("Testing /dream command...");
    await ops.type(cfg.selectors.chatInput, "/dream");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for response (with fallback)
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const dreamResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(dreamResponse, "/dream response should not be empty");

    // Check for dream-like markers (whimsical, surreal words)
    const hasDreamMarkers = /(dream|surreal|whimsical|fantasy|magic|wonder)/i.test(dreamResponse);
    if (hasDreamMarkers) {
      notes.push("✓ Dream response contains whimsical markers");
    } else {
      notes.push("Dream response received (markers not detected, but non-empty)");
    }
    notes.push(`Dream response: ${dreamResponse.substring(0, 80)}...`);

    // Test /nap command
    notes.push("Testing /nap command...");
    await ops.type(cfg.selectors.chatInput, "/nap");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Check for nap overlay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const napOverlayVisible = await ops.isVisible(cfg.selectors.napOverlay);
    assert.assertTrue(napOverlayVisible, "/nap should show nap overlay");
    notes.push("✓ Nap overlay appeared");

    // Check that input is disabled during nap
    const inputDisabled = await ops.isDisabled(cfg.selectors.chatInput);
    if (inputDisabled) {
      notes.push("✓ Input disabled during nap");
    }

    // Wait for nap to complete (5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 5500));

    // Overlay should be gone
    const overlayGone = !(await ops.isVisible(cfg.selectors.napOverlay));
    assert.assertTrue(overlayGone, "Nap overlay should disappear after 5 seconds");
    notes.push("✓ Nap overlay disappeared after timeout");

    // Input should be enabled again
    const inputEnabled = !(await ops.isDisabled(cfg.selectors.chatInput));
    assert.assertTrue(inputEnabled, "Input should be enabled after nap");
    notes.push("✓ Input re-enabled after nap");

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/50_commands_dream_nap`;
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


