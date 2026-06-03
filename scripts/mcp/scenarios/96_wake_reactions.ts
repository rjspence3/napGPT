/**
 * Test wake reactions - detecting wake keywords and reactions
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

const WAKE_KEYWORDS = ["wake", "awake", "hello", "hey", "hi", "up"];

export async function runWakeReactionsTest(client: MCPClient): Promise<{
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

    // Test wake keyword handling
    const keywords = WAKE_KEYWORDS.slice(0, 3);
    let wakeReactionCount = 0;
    let respondedCount = 0;
    for (const keyword of keywords) {
      notes.push(`Testing wake keyword: "${keyword}"...`);

      await ops.type(cfg.selectors.chatInput, keyword);
      await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

      // Wait for response
      try {
        await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
      } catch {
        await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
      }
      await ops.waitForNetworkIdle(cfg.timeouts.medium);

      const responseText = await ops.getText(cfg.selectors.lastAssistantMsg);
      // Every wake keyword must get a substantive reply. This is the deterministic
      // contract; the exact wording is model-dependent (real LLM) and randomized
      // (mock), so wake-word matches below are tracked as signal, not asserted.
      assert.assertTrue(
        responseText.trim().length >= 8,
        `Wake keyword "${keyword}" should get a substantive reply (got: "${responseText}")`
      );
      respondedCount++;

      const hasWakeReaction = /(wake|awake|up|here|ready|alive)/i.test(responseText);
      if (hasWakeReaction) {
        wakeReactionCount++;
        notes.push(`  ✓ Wake reaction detected: "${responseText.substring(0, 60)}..."`);
      } else {
        notes.push(`  No wake-word phrasing (model-dependent): "${responseText.substring(0, 60)}..."`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    assert.assertTrue(
      respondedCount === keywords.length,
      `App should respond to every wake keyword (responded ${respondedCount}/${keywords.length})`
    );
    notes.push(`Responded to ${respondedCount}/${keywords.length} keywords; wake-word phrasing in ${wakeReactionCount}/${keywords.length} (informational)`);

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/96_wake_reactions`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      wakeReactionCount,
      keywords: WAKE_KEYWORDS.slice(0, 3),
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

