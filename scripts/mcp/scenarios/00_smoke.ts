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
    // Page should already be loaded by test isolation
    notes.push("Page loaded");
    log(`[00_smoke] Page ready`);

    // Check for mock banner (should be visible without API key)
    log(`[00_smoke] Checking for mock banner...`);
    const mockBannerVisible = await ops.isVisible(cfg.selectors.bannerMockMode);
    if (mockBannerVisible) {
      notes.push("Mock mode banner visible (expected without API key)");
      log(`[00_smoke] Mock banner visible`);
    }

    // Set up network response verification
    log(`[00_smoke] Setting up network response verification...`);
    let apiResponse: any = null;
    let apiResponseBody: any = null;
    
    // Wait for API response (only if page is available)
    let responsePromise: Promise<any> | null = null;
    if (client.page) {
      responsePromise = client.page.waitForResponse(
        (response) => {
          const url = response.url();
          const method = response.request().method();
          return url.includes('/api/chat') && method === 'POST';
        },
        { timeout: 90000 } // 90s timeout
      ).then(async (response) => {
        apiResponse = response;
        try {
          apiResponseBody = await response.json();
        } catch (e) {
          log(`[00_smoke] Failed to parse response JSON: ${e}`);
        }
        return response;
      }).catch((err) => {
        log(`[00_smoke] Response wait failed: ${err.message}`);
        return null;
      });
    } else {
      log(`[00_smoke] Page not available, skipping network verification`);
    }

    // Type and send a message
    log(`[00_smoke] Typing message...`);
    await ops.type(cfg.selectors.chatInput, "Hello!");
    log(`[00_smoke] Clicking send button...`);
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });
    
    // Wait for API response (if verification is set up)
    if (responsePromise) {
      log(`[00_smoke] Waiting for API response...`);
      await responsePromise;
      
      // Verify API response
      if (apiResponse && apiResponseBody) {
        log(`[00_smoke] API Response received:`, {
          status: apiResponse.status(),
          hasReply: !!apiResponseBody.reply,
          replyLength: apiResponseBody.reply?.length || 0,
          replyPreview: apiResponseBody.reply?.substring(0, 100) || '(empty)',
        });
        assert.assertTrue(
          !!apiResponseBody.reply && apiResponseBody.reply.length > 0,
          `API must return non-empty reply (got length: ${apiResponseBody.reply?.length || 0})`
        );
        notes.push(`API response verified: ${apiResponseBody.reply.length} chars`);
      } else {
        log(`[00_smoke] Warning: API response not captured`);
        notes.push("API response not captured (may have timed out)");
      }
    }

    // Wait for network to be idle before checking for messages
    log(`[00_smoke] Waiting for network idle...`);
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

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

    // Wait for message to appear with non-empty content (using waitForFunction)
    log(`[00_smoke] Waiting for assistant message with content (timeout: ${cfg.timeouts.long}ms)...`);
    await ops.waitForFunction(
      () => {
        // Try primary selector first
        const lastMsg = document.querySelector('[data-testid="message-assistant"]:last-of-type');
        if (lastMsg) {
          const pTag = lastMsg.querySelector('p');
          const text = pTag ? (pTag.textContent || "").trim() : (lastMsg.textContent || "").trim();
          if (text.length > 0) return text;
        }
        // Fallback to any assistant message
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
    log(`[00_smoke] Found message with content`);

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


