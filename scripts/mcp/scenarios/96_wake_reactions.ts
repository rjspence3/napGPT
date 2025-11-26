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

    // Test wake keyword detection
    let wakeReactionCount = 0;
    for (const keyword of WAKE_KEYWORDS.slice(0, 3)) {
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
      assert.assertNotEmpty(responseText, `Response for "${keyword}" should not be empty`);

      // Check for wake reaction patterns
      const hasWakeReaction = /(wake|awake|up|here|ready|alive)/i.test(responseText);
      if (hasWakeReaction) {
        wakeReactionCount++;
        notes.push(`  ✓ Wake reaction detected: "${responseText.substring(0, 60)}..."`);
      } else {
        notes.push(`  No wake reaction (may be normal): "${responseText.substring(0, 60)}..."`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // At least one should trigger a wake reaction
    assert.assertTrue(
      wakeReactionCount >= 1,
      `At least one wake keyword should trigger a reaction (found ${wakeReactionCount}/3)`
    );
    notes.push(`Wake reactions found: ${wakeReactionCount}/3`);

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

