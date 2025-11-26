/**
 * Test /recall command - recall previous conversation
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runRecallCommandTest(client: MCPClient): Promise<{
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

    // Enable recall command via test config
    await client.evaluate(() => {
      (window as any).__nap_test = {
        ENABLE_RECALL_COMMAND: true,
      };
    });
    notes.push("Recall command enabled");

    // Send first message to establish conversation
    await ops.type(cfg.selectors.chatInput, "Tell me a fact about JavaScript");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const firstResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    notes.push(`First response: ${firstResponse.substring(0, 60)}...`);

    // Send /recall command
    await ops.type(cfg.selectors.chatInput, "/recall");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const recallResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(recallResponse, "/recall response should not be empty");
    notes.push(`Recall response: ${recallResponse.substring(0, 100)}...`);

    // Check for recall patterns (references to previous conversation)
    const recallPatterns = [
      /(recall|remember|said|mentioned|before|earlier|vaguely)/i,
      /(JavaScript|javascript|js)/i, // Should reference the first message topic
    ];
    const hasRecall = recallPatterns.some((pattern) => pattern.test(recallResponse));

    // Recall may return "I only remember pillows" if no memory, which is also valid
    const hasNoMemory = /(pillows|don't remember|no memory|forgot)/i.test(recallResponse);

    assert.assertTrue(
      hasRecall || hasNoMemory,
      "/recall should either reference previous conversation or indicate no memory"
    );

    if (hasRecall) {
      notes.push("✓ Recall command referenced previous conversation");
    } else if (hasNoMemory) {
      notes.push("✓ Recall command indicated no memory (valid response)");
    }

    // Cleanup
    await client.evaluate(() => {
      delete (window as any).__nap_test;
    });

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/99_recall_command`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      firstResponse,
      recallResponse,
      hasRecall,
      hasNoMemory,
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

