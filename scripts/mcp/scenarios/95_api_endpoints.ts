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
    // Page should already be loaded by test isolation
    notes.push("Page loaded");

    // Test 1: GET /api/mode
    notes.push("Testing GET /api/mode...");
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for page to settle
    const modeResponse = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/mode");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await res.json();
      } catch (error: any) {
        return { error: error.message };
      }
    });
    assert.assertTrue(
      typeof modeResponse.isMock === "boolean" && !modeResponse.error,
      `GET /api/mode should return isMock boolean (got: ${JSON.stringify(modeResponse)})`
    );
    notes.push(`Mode response: isMock=${modeResponse.isMock}`);

    // Test 2: PUT /api/chat (set boost cookie)
    notes.push("Testing PUT /api/chat (boost cookie)...");
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait before request
    const putResponse = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boost: 20 }),
        });
        // Wait a bit for cookie to be set
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          status: res.status,
          cookies: document.cookie,
          ok: res.ok,
        };
      } catch (error: any) {
        return { status: 0, cookies: document.cookie, error: error.message };
      }
    });
    assert.assertTrue(
      (putResponse.status === 200 || putResponse.status === 201) && putResponse.ok !== false,
      `PUT /api/chat should succeed (got status ${putResponse.status}, ok: ${putResponse.ok})`
    );
    // Cookie might be httpOnly, so check via document.cookie might not work
    // Instead, just verify the request succeeded
    notes.push(`PUT response: status=${putResponse.status}, cookies present=${putResponse.cookies.length > 0}`);

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

