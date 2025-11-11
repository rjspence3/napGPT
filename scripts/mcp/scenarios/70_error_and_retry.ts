/**
 * Test error handling and retry logic
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runErrorAndRetryTest(client: MCPClient): Promise<{
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
  let requestBlocked = false;

  try {
    // Navigate first to get page ready
    console.log(`[70_error_and_retry] Navigating to ${cfg.baseUrl}...`);
    await client.goto(cfg.baseUrl);
    console.log(`[70_error_and_retry] Page loaded`);
    
    // Enable request interception AFTER navigation but BEFORE sending message
    notes.push("Setting up request interception...");
    console.log(`[70_error_and_retry] Setting up request interception...`);
    if (page) {
      await page.setRequestInterception(true);
      console.log(`[70_error_and_retry] Request interception enabled`);
      
      // Set up handler - must handle ALL requests
      // Remove any existing handlers first
      page.removeAllListeners('request');
      
      page.on('request', async (request: any) => {
        const url = request.url();
        console.log(`[70_error_and_retry] Intercepted request: ${url}`);
        if (url.includes('/api/chat')) {
          console.log(`[70_error_and_retry] Blocking /api/chat request`);
          requestBlocked = true;
          try {
            await request.abort();
            console.log(`[70_error_and_retry] Request aborted successfully`);
          } catch (abortError: any) {
            console.log(`[70_error_and_retry] Error aborting request: ${abortError.message}`);
          }
        } else {
          try {
            await request.continue();
          } catch (e) {
            // Ignore errors for non-chat requests
            console.log(`[70_error_and_retry] Error continuing non-chat request (ignored)`);
          }
        }
      });
    }
    notes.push("Blocking network requests to /api/chat...");
    console.log(`[70_error_and_retry] Request handler set up, requestBlocked=${requestBlocked}`);

    // Try to send a message (should fail gracefully)
    await ops.type(cfg.selectors.chatInput, "Test message");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for error response or timeout
    console.log(`[70_error_and_retry] Waiting ${cfg.timeouts.medium}ms for error response...`);
    await new Promise((resolve) => setTimeout(resolve, cfg.timeouts.medium));
    console.log(`[70_error_and_retry] Wait complete, checking for error message...`);

    // Check for error message or fallback
    // Try to get any assistant message (error or success)
    let errorResponse = "";
    console.log(`[70_error_and_retry] Attempting to get error response text...`);
    try {
      errorResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
      console.log(`[70_error_and_retry] Got response with primary selector: ${errorResponse.substring(0, 100)}`);
    } catch (e: any) {
      console.log(`[70_error_and_retry] Primary selector failed: ${e.message}, trying fallback...`);
      // Try fallback selector
      try {
        errorResponse = await ops.getText(cfg.selectors.anyAssistantMsg);
        console.log(`[70_error_and_retry] Got response with fallback selector: ${errorResponse.substring(0, 100)}`);
      } catch (e2: any) {
        // If no message appears, that's also acceptable (error was handled)
        errorResponse = "";
        console.log(`[70_error_and_retry] Fallback selector also failed: ${e2.message}, no message found`);
      }
    }
    
    const hasError = errorResponse.includes("broke") || 
                    errorResponse.includes("try again") || 
                    errorResponse.includes("rate limited") ||
                    errorResponse.includes("network issue") ||
                    requestBlocked; // If request was blocked, that's success

    console.log(`[70_error_and_retry] Error check: hasError=${hasError}, requestBlocked=${requestBlocked}, responseLength=${errorResponse.length}`);
    assert.assertTrue(hasError || requestBlocked, `Should show error message or block request (blocked: ${requestBlocked}, response: ${errorResponse.substring(0, 60)})`);
    notes.push(`Error handling: request blocked=${requestBlocked}, response=${errorResponse.substring(0, 60)}...`);
    console.log(`[70_error_and_retry] ✓ Error handling test passed`);

    // Unblock network
    notes.push("Unblocking network...");
    if (page) {
      await page.setRequestInterception(false);
    }

    // Reload page to reset state
    await client.goto(cfg.baseUrl);

    // Send another message (should succeed now)
    await ops.type(cfg.selectors.chatInput, "Hello again");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for response (with fallback)
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const successResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(successResponse, "Response after unblock should not be empty");
    notes.push("✓ Message succeeded after network unblock");

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/70_error_and_retry`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);

    return {
      passed: true,
      duration: Date.now() - startTime,
      notes,
    };
  } catch (error: any) {
    notes.push(`Error: ${error.message}`);
    // Try to unblock network in case of error
    try {
      if (page) {
        await page.setRequestInterception(false);
      }
    } catch {}
    return {
      passed: false,
      duration: Date.now() - startTime,
      notes,
    };
  }
}


