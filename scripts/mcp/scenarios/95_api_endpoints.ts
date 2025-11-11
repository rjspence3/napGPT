/**
 * Test API endpoints: PUT, DELETE, GET /api/mode
 */

import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runApiEndpointsTest(client: MCPClient): Promise<{
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

    // Test 1: GET /api/mode
    notes.push("Testing GET /api/mode...");
    const modeResponse = await page.evaluate(async () => {
      const res = await fetch("/api/mode");
      return await res.json();
    });
    assert.assertTrue(
      typeof modeResponse.isMock === "boolean",
      "GET /api/mode should return isMock boolean"
    );
    notes.push(`Mode response: isMock=${modeResponse.isMock}`);

    // Test 2: PUT /api/chat (set boost cookie)
    notes.push("Testing PUT /api/chat (boost cookie)...");
    const putResponse = await page.evaluate(async () => {
      const res = await fetch("/api/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boost: 20 }),
      });
      return {
        status: res.status,
        cookies: document.cookie,
      };
    });
    assert.assertTrue(
      putResponse.status === 200 || putResponse.status === 201,
      `PUT /api/chat should succeed (got ${putResponse.status})`
    );
    const hasBoostCookie = putResponse.cookies.includes("napgpt_boost");
    assert.assertTrue(hasBoostCookie, "PUT /api/chat should set napgpt_boost cookie");
    notes.push(`PUT response: status=${putResponse.status}, cookie set=${hasBoostCookie}`);

    // Test 3: DELETE /api/chat (clear rate limit - test mode only)
    notes.push("Testing DELETE /api/chat (rate limit clearing)...");
    const deleteResponse = await page.evaluate(async () => {
      const res = await fetch("/api/chat", {
        method: "DELETE",
      });
      return {
        status: res.status,
        body: await res.json().catch(() => ({})),
      };
    });
    // DELETE may return 403 if not in test mode, or 200 if in test mode
    assert.assertTrue(
      deleteResponse.status === 200 || deleteResponse.status === 403,
      `DELETE /api/chat should return 200 (test mode) or 403 (not test mode), got ${deleteResponse.status}`
    );
    if (deleteResponse.status === 200) {
      assert.assertTrue(
        deleteResponse.body.success === true,
        "DELETE /api/chat should return success: true in test mode"
      );
      notes.push("✓ Rate limit cleared (test mode)");
    } else {
      notes.push("DELETE /api/chat returned 403 (not in test mode, expected)");
    }

    // Save artifacts
    const artifactDir = `artifacts/${Date.now()}/95_api_endpoints`;
    await artifacts.screenshot(`${artifactDir}/screenshot.png`);
    await artifacts.saveMetrics(`${artifactDir}/results.json`, {
      modeResponse,
      putResponse,
      deleteResponse,
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

