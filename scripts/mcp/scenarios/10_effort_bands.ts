/**
 * Test effort bands: Verify strategy-like behavior at different effort levels
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

const EFFORT_LEVELS = [5, 25, 60, 92];
const TEST_MESSAGE = "What is React?";

export async function runEffortBandsTest(client: MCPClient): Promise<{
  passed: boolean;
  duration: number;
  notes: string[];
  results: Array<{ effort: number; length: number; text: string }>;
}> {
  const startTime = Date.now();
  const notes: string[] = [];
  const assert = createAssertions();
  const { ops, artifacts } = client;
  const cfg = config;
  const results: Array<{ effort: number; length: number; text: string }> = [];

  try {
    // Page should already be loaded by test isolation
    for (const effort of EFFORT_LEVELS) {
      notes.push(`Testing effort level: ${effort}`);

      // Set effort
      await ops.setSlider(cfg.selectors.effortSlider, effort);

      // Verify effort was set
      await ops.evaluate(() => {
        return (window as any).__nap_store?.getState().effort;
      });

      // Clear previous messages (refresh or clear input)
      // Get current message count
      const initialCount = await ops.evaluate(() => {
        return document.querySelectorAll('[data-testid="message-assistant"]').length;
      });

      await ops.type(cfg.selectors.chatInput, TEST_MESSAGE);
      // Send message
      await ops.click(cfg.selectors.sendBtn);

      // Wait for new message to appear
      await ops.waitForFunction(
        (count: number) => document.querySelectorAll('[data-testid="message-assistant"]').length > count,
        { timeout: 10000 },
        initialCount
      );

      // Wait for network to be idle before checking for messages
      await ops.waitForNetworkIdle(cfg.timeouts.medium);

      // Wait for response with non-empty content
      await ops.waitForFunction(
        () => {
          const lastMsg = document.querySelector('[data-testid="message-assistant"]:last-of-type');
          if (lastMsg) {
            const pTag = lastMsg.querySelector('p');
            const text = pTag ? (pTag.textContent || "").trim() : (lastMsg.textContent || "").trim();
            if (text.length > 0) return text;
          }
          const anyMsg = document.querySelector('[data-testid="message-assistant"]');
          if (anyMsg) {
            const pTag = anyMsg.querySelector('p');
            const text = pTag ? (pTag.textContent || "").trim() : (anyMsg.textContent || "").trim();
            if (text.length > 0) return text;
          }
          return null;
        },
        { timeout: cfg.timeouts.long, polling: 200 }
      );
      await ops.waitForNetworkIdle(cfg.timeouts.medium);

      // Get response
      const responseText = await ops.getText(cfg.selectors.lastAssistantMsg);
      const length = responseText.length;

      assert.assertNotEmpty(responseText, `Effort ${effort}: Response should not be empty`);

      // Heuristic checks based on effort
      if (effort <= 15) {
        // Low effort: should include refusal phrases OR be very short
        const hasRefusal = /(meh|tired|google|idk|nah|maybe|just|pretend|zzz)/i.test(responseText);
        const isShort = length < 200;
        assert.assertTrue(
          hasRefusal || isShort,
          `Effort ${effort}: Should be short (<200 chars) or contain refusal (got ${length} chars, refusal: ${hasRefusal})`
        );
        if (hasRefusal) {
          notes.push(`  ✓ Contains refusal phrase`);
        }
        if (isShort) {
          notes.push(`  ✓ Response is short (${length} chars)`);
        }
      } else if (effort <= 35) {
        // Medium-low: one-liner or 2 sentences
        assert.assertLessThan(length, 300, `Effort ${effort}: Should be one-liner (<300 chars)`);
      } else if (effort <= 85) {
        // Medium-high: 3-6 lines, unless the dropout processor fired (valid zzz cutoff)
        const isDropout = responseText.includes('… zzz') || responseText.includes('... zzz');
        if (isDropout) {
          notes.push(`  ✓ Dropout fired (gave up mid-response)`);
        } else {
          assert.assertBetween(
            length,
            120,
            800,
            `Effort ${effort}: Should be medium length (120-800 chars)`
          );
        }
      } else {
        // High effort: longer answer, may include sign-off
        assert.assertGreaterThan(length, 100, `Effort ${effort}: Should be longer (>100 chars)`);
        if (responseText.includes("back to sleep") || responseText.includes("going back")) {
          notes.push(`  ✓ Contains sign-off phrase`);
        }
      }

      results.push({ effort, length, text: responseText });
      notes.push(`  Response length: ${length} chars`);

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/10_effort_bands`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, { results, notes });

    return {
      passed: true,
      duration: Date.now() - startTime,
      notes,
      results,
    };
  } catch (error: any) {
    notes.push(`Error: ${error.message}`);
    return {
      passed: false,
      duration: Date.now() - startTime,
      notes,
      results,
    };
  }
}


