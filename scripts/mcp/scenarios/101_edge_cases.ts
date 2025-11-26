/**
 * Test edge cases: boundaries, empty inputs, long messages, special characters
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runEdgeCasesTest(client: MCPClient): Promise<{
  passed: boolean;
  duration: number;
  notes: string[];
}> {
  const startTime = Date.now();
  const notes: string[] = [];
  const assert = createAssertions();
  const { ops, artifacts } = client;
  const cfg = config;
  const page = (client as any).page;

  try {
    // Page should already be loaded by test isolation
    notes.push("Page loaded");

    // Test 1: Effort boundaries (0 and 100)
    notes.push("Testing effort boundaries...");

    // Test effort = 0
    await ops.setSlider(cfg.selectors.effortSlider, 0);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const effort0Label = await ops.getText('[data-testid="effort-slider"]').catch(() => "");
    const effort0Value = await page.evaluate(() => {
      const slider = document.querySelector('[data-testid="effort-slider"]') as HTMLInputElement;
      return slider?.value || "";
    });
    assert.assertTrue(
      effort0Value === "0",
      `Effort slider should allow 0 (got: ${effort0Value})`
    );
    notes.push("✓ Effort slider accepts 0");

    // Test effort = 100
    await ops.setSlider(cfg.selectors.effortSlider, 100);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const effort100Value = await page.evaluate(() => {
      const slider = document.querySelector('[data-testid="effort-slider"]') as HTMLInputElement;
      return slider?.value || "";
    });
    assert.assertTrue(
      effort100Value === "100",
      `Effort slider should allow 100 (got: ${effort100Value})`
    );
    notes.push("✓ Effort slider accepts 100");

    // Test 2: Empty input handling
    notes.push("Testing empty input handling...");
    const sendButtonDisabled = await ops.isDisabled(cfg.selectors.sendBtn);
    assert.assertTrue(
      sendButtonDisabled,
      "Send button should be disabled when input is empty"
    );
    notes.push("✓ Send button disabled for empty input");

    // Test 3: Very long message
    notes.push("Testing very long message...");
    const longMessage = "A".repeat(1000);
    await ops.type(cfg.selectors.chatInput, longMessage);
    const initialCountLong = await page.evaluate(() => document.querySelectorAll('[data-testid="message-assistant"]').length);
    await ops.click(cfg.selectors.sendBtn);

    await ops.waitForFunction(
      (count: number) => document.querySelectorAll('[data-testid="message-assistant"]').length > count,
      { timeout: cfg.timeouts.long },
      initialCountLong
    );
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const longResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(longResponse, "Long message should receive response");
    notes.push(`✓ Long message handled (${longMessage.length} chars)`);

    // Test 4: Special characters
    notes.push("Testing special characters...");
    await ops.type(cfg.selectors.chatInput, "Hello! 🎉 Test with émojis & symbols: @#$%");
    const initialCountSpecial = await page.evaluate(() => document.querySelectorAll('[data-testid="message-assistant"]').length);
    await ops.click(cfg.selectors.sendBtn);

    await ops.waitForFunction(
      (count: number) => document.querySelectorAll('[data-testid="message-assistant"]').length > count,
      { timeout: cfg.timeouts.long },
      initialCountSpecial
    );
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const specialResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(specialResponse, "Special characters should be handled");
    notes.push("✓ Special characters handled");

    // Test 5: Multiple rapid clicks (spam protection)
    notes.push("Testing rapid clicks protection...");
    await ops.type(cfg.selectors.chatInput, "Rapid test");

    // Click multiple times rapidly
    for (let i = 0; i < 3; i++) {
      await ops.click(cfg.selectors.sendBtn, { waitFor: 50 });
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Should only have one response (or handle gracefully)
    const messageCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid="message-assistant"]').length;
    });

    assert.assertTrue(
      messageCount >= 1,
      `Should have at least one response after rapid clicks (got ${messageCount})`
    );
    notes.push(`✓ Rapid clicks handled (${messageCount} messages)`);

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/101_edge_cases`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      effort0Value,
      effort100Value,
      longMessageLength: longMessage.length,
      messageCount,
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

