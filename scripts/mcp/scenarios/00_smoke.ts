/**
 * Smoke test: Basic page load and message sending
 */

import type { MCPClient } from "../utils/mcpClient";
import type { BrowserOps } from "../utils/browserOps";
import { createAssertions } from "../utils/assertions";
import config from "../config";

// Force unbuffered console output
const log = (...args: any[]) => {
  console.log(...args);
  if (process.stdout.isTTY) {
    process.stdout.write('');
  }
};

export async function runSmokeTest(client: MCPClient): Promise<{
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
    // Navigate to app
    log(`[00_smoke] Navigating to ${cfg.baseUrl}...`);
    await client.goto(cfg.baseUrl);
    notes.push("Page loaded");
    log(`[00_smoke] Page loaded`);

    // Check for mock banner (should be visible without API key)
    log(`[00_smoke] Checking for mock banner...`);
    const mockBannerVisible = await ops.isVisible(cfg.selectors.bannerMockMode);
    if (mockBannerVisible) {
      notes.push("Mock mode banner visible (expected without API key)");
      log(`[00_smoke] Mock banner visible`);
    }

    // Type and send a message
    log(`[00_smoke] Typing message...`);
    await ops.type(cfg.selectors.chatInput, "Hello!");
    log(`[00_smoke] Clicking send button...`);
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for typing indicator first (if it appears)
    log(`[00_smoke] Waiting for typing indicator...`);
    try {
      await ops.waitFor('[data-testid="typing-indicator"]', cfg.timeouts.short);
      notes.push("Typing indicator appeared");
      log(`[00_smoke] Typing indicator appeared`);
    } catch {
      notes.push("No typing indicator found (may have already completed)");
      log(`[00_smoke] No typing indicator (may have completed)`);
    }

    // Wait for message to appear (with fallback)
    log(`[00_smoke] Waiting for assistant message (timeout: ${cfg.timeouts.long}ms)...`);
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
      log(`[00_smoke] Found message with primary selector`);
    } catch {
      // Fallback to any assistant message
      notes.push("Trying fallback selector...");
      log(`[00_smoke] Primary selector failed, trying fallback...`);
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
      log(`[00_smoke] Found message with fallback selector`);
    }
    log(`[00_smoke] Waiting for network idle...`);
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    // Assert response is non-empty
    log(`[00_smoke] Getting response text...`);
    // Try to get text - if lastAssistantMsg fails, try anyAssistantMsg
    let responseText = await ops.getText(cfg.selectors.lastAssistantMsg);
    if (!responseText && cfg.selectors.anyAssistantMsg) {
      log(`[00_smoke] Primary selector returned empty, trying anyAssistantMsg...`);
      responseText = await ops.getText(cfg.selectors.anyAssistantMsg);
    }
    assert.assertNotEmpty(responseText, "Assistant response should not be empty");
    notes.push(`Received response: ${responseText.substring(0, 50)}...`);
    log(`[00_smoke] Response received: ${responseText.substring(0, 100)}...`);

    // Capture artifacts
    const artifactDir = `artifacts/${Date.now()}/00_smoke`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    const consoleLogs = await artifacts.captureConsoleLogs();
    await artifacts.saveMetrics(`${artifactDir}/console.log.json`, { logs: consoleLogs });
    notes.push(`Captured ${consoleLogs.length} console logs`);

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


