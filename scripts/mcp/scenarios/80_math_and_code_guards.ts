/**
 * Test math and code intent guards (should never return empty)
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runMathAndCodeGuardsTest(client: MCPClient): Promise<{
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

    // Test 1: Math question at low effort
    notes.push("Test 1: Math question at low effort (10)");
    await ops.setSlider(cfg.selectors.effortSlider, 10);
    await new Promise((resolve) => setTimeout(resolve, 300));

    await ops.type(cfg.selectors.chatInput, "What is 2 + 2?");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for response (with fallback)
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const mathResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(mathResponse, "Math response should never be empty");
    notes.push(`Math response: ${mathResponse}`);

    // Should contain "4" or a number
    const hasNumber = /\d/.test(mathResponse);
    if (hasNumber) {
      notes.push("✓ Math response contains a number");
    }

    // Test 2: Code question at high effort
    notes.push("Test 2: Code question at high effort (85)");
    await ops.setSlider(cfg.selectors.effortSlider, 85);
    await new Promise((resolve) => setTimeout(resolve, 300));

    await ops.type(cfg.selectors.chatInput, "Write a function to sort an array");
    await ops.click(cfg.selectors.sendBtn, { waitFor: 500 });

    // Wait for response (with fallback)
    try {
      await ops.waitFor(cfg.selectors.lastAssistantMsg, cfg.timeouts.long);
    } catch {
      await ops.waitFor(cfg.selectors.anyAssistantMsg, cfg.timeouts.medium);
    }
    await ops.waitForNetworkIdle(cfg.timeouts.medium);

    const codeResponse = await ops.getText(cfg.selectors.lastAssistantMsg);
    assert.assertNotEmpty(codeResponse, "Code response should never be empty");
    notes.push(`Code response: ${codeResponse.substring(0, 100)}...`);

    // Should contain code-like content (function, array, sort, etc.)
    const hasCodeMarkers = /(function|array|sort|code|implement)/i.test(codeResponse);
    if (hasCodeMarkers) {
      notes.push("✓ Code response contains code-related terms");
    }

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/80_math_and_code_guards`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      mathQuestion: "What is 2 + 2?",
      mathResponse,
      codeQuestion: "Write a function to sort an array",
      codeResponse,
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


