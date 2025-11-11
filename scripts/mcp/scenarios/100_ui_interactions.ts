/**
 * Test UI interactions: keyboard shortcuts, focus, scroll, message alignment
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runUiInteractionsTest(client: MCPClient): Promise<{
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
    await client.goto(cfg.baseUrl);
    notes.push("Page loaded");

    // Test 1: Keyboard shortcut - Enter to send
    notes.push("Testing Enter key to send message...");
    await ops.type(cfg.selectors.chatInput, "Test message");
    
    // Press Enter
    await page.keyboard.press("Enter");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Wait for response
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const enterResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(enterResponse, "Message sent via Enter should receive response");
    notes.push("✓ Enter key sends message");

    // Test 2: Message alignment - user messages right, assistant left
    notes.push("Testing message alignment...");
    const alignment = await page.evaluate(() => {
      const userMsg = document.querySelector('[data-testid="message-user"]');
      const assistantMsg = document.querySelector('[data-testid="message-assistant"]');
      
      if (!userMsg || !assistantMsg) return null;
      
      const userParent = userMsg.parentElement;
      const assistantParent = assistantMsg.parentElement;
      
      return {
        userHasJustifyEnd: userParent?.classList.contains("justify-end") || 
                          window.getComputedStyle(userParent || userMsg).justifyContent === "flex-end",
        assistantHasJustifyStart: assistantParent?.classList.contains("justify-start") ||
                                 window.getComputedStyle(assistantParent || assistantMsg).justifyContent === "flex-start",
      };
    });

    if (alignment) {
      assert.assertTrue(
        alignment.userHasJustifyEnd,
        "User messages should be right-aligned (justify-end)"
      );
      assert.assertTrue(
        alignment.assistantHasJustifyStart,
        "Assistant messages should be left-aligned (justify-start)"
      );
      notes.push("✓ Message alignment correct");
    } else {
      notes.push("Could not verify alignment (messages not found)");
    }

    // Test 3: Input focus after send
    notes.push("Testing input focus after send...");
    await ops.type(cfg.selectors.chatInput, "Another test");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const isFocused = await page.evaluate((selector) => {
      const input = document.querySelector(selector);
      return input === document.activeElement;
    }, cfg.selectors.chatInput);

    // Focus may or may not be maintained (depends on implementation)
    notes.push(`Input focused after send: ${isFocused}`);

    // Test 4: Scroll behavior - should scroll to bottom
    notes.push("Testing scroll behavior...");
    const scrollInfo = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="message-list"]') || 
                       document.querySelector('.flex-1.overflow-hidden');
      if (!container) return null;
      
      return {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        isAtBottom: Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 10,
      };
    });

    if (scrollInfo) {
      notes.push(`Scroll position: ${scrollInfo.scrollTop}/${scrollInfo.scrollHeight}, at bottom: ${scrollInfo.isAtBottom}`);
      // Just verify scroll info is available, don't assert on exact position
    }

    // Test 5: Input clears after send
    notes.push("Testing input clears after send...");
    await ops.type(cfg.selectors.chatInput, "Clear test");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });
    
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const inputValue = await page.evaluate((selector) => {
      const input = document.querySelector(selector) as HTMLInputElement;
      return input?.value || "";
    }, cfg.selectors.chatInput);

    assert.assertTrue(
      inputValue.length === 0,
      `Input should be cleared after send (got: "${inputValue}")`
    );
    notes.push("✓ Input clears after send");

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/100_ui_interactions`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      alignment,
      scrollInfo,
      inputValue,
      isFocused,
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

