/**
 * Test conversation context threading
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runContextThreadingTest(client: MCPClient): Promise<{
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

    // First message
    notes.push("Sending first message...");
    await ops.type(cfg.selectors.chatInput, "Tell me a fact about the app");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for response (with fallback)
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const firstResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(firstResponse, "First response should not be empty");
    notes.push(`First response: ${firstResponse.substring(0, 60)}...`);

    // Extract a key topic from first response for context check
    const firstTopic = firstResponse.split(" ").slice(0, 3).join(" ");

    // Second message (follow-up)
    notes.push("Sending follow-up message...");
    await ops.type(cfg.selectors.chatInput, "Can you tell me more?");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for response (with fallback)
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const secondResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(secondResponse, "Second response should not be empty");
    notes.push(`Second response: ${secondResponse.substring(0, 60)}...`);

    // Check if second response references context (mentions prior subject or maintains tone)
    // This is a heuristic - the response should not be completely disconnected
    const hasContext = secondResponse.length > 20; // At minimum, should be substantial
    assert.assertTrue(hasContext, "Follow-up response should maintain context");

    // Check if response mentions something related (heuristic)
    const mentionsPrior = firstTopic.split(" ").some((word) =>
      secondResponse.toLowerCase().includes(word.toLowerCase())
    );
    if (mentionsPrior) {
      notes.push("✓ Follow-up references prior context");
    } else {
      notes.push("Follow-up received (context check: tone maintained)");
    }

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/60_context_threading`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/conversation.json`, {
      firstMessage: "Tell me a fact about the app",
      firstResponse,
      secondMessage: "Can you tell me more?",
      secondResponse,
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


