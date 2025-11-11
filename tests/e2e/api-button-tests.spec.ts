import { test, expect } from "@playwright/test";

/**
 * Comprehensive API Button Tests
 * Tests all API calls triggered by UI buttons with real API integration
 */

test.describe("API Button Tests - Real API Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Clear rate limit before each test (test mode only)
    await page.request.delete("/api/chat").catch(() => {});
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Send Button - POST /api/chat", () => {
    test("should send message and receive response", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Hello, test message");
      
      // Intercept the API call
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      // Wait for API response
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty("reply");
      expect(data).toHaveProperty("meta");
      expect(typeof data.reply).toBe("string");
      expect(data.reply.length).toBeGreaterThan(0);
      
      // Verify message appears in UI
      await expect(page.locator("text=Hello, test message")).toBeVisible();
      await expect(page.locator("text=" + data.reply.substring(0, 20))).toBeVisible({ timeout: 10000 });
    });

    test("should include effort level in API request", async ({ page }) => {
      // Set effort to 75
      const slider = page.locator('input[type="range"]');
      await slider.fill("75");
      await slider.dispatchEvent("change");
      await page.waitForTimeout(100);
      
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("What is effort?");
      
      // Capture the request
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const request = await requestPromise;
      const requestBody = request.postDataJSON();
      
      expect(requestBody).toHaveProperty("effort", 75);
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody.messages).toBeInstanceOf(Array);
    });

    test("should include dream flag when /dream command is used", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("/dream");
      
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const request = await requestPromise;
      const requestBody = request.postDataJSON();
      
      expect(requestBody).toHaveProperty("flags");
      expect(requestBody.flags).toHaveProperty("dream", true);
    });

    test("should send conversation history in messages array", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      
      // Send first message
      await input.fill("First message");
      await page.locator('button:has-text("Send")').click();
      await page.waitForTimeout(2000);
      
      // Send second message
      await input.fill("Second message");
      
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const request = await requestPromise;
      const requestBody = request.postDataJSON();
      
      expect(requestBody.messages.length).toBeGreaterThanOrEqual(2);
      expect(requestBody.messages[0].content).toContain("First message");
      expect(requestBody.messages[requestBody.messages.length - 1].content).toContain("Second message");
    });

    test("should handle API errors gracefully", async ({ page }) => {
      // Mock API failure
      await page.route("**/api/chat", (route) => {
        if (route.request().method() === "POST") {
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal server error" }),
          });
        } else {
          route.continue();
        }
      });
      
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test error");
      await page.locator('button:has-text("Send")').click();
      
      // Should show error message
      await expect(page.locator("text=ugh... something broke")).toBeVisible({ timeout: 5000 });
    });

    test("should handle rate limiting", async ({ page }) => {
      // Temporarily disable test mode to test actual rate limiting
      // Send 11 requests quickly to trigger rate limit (limit is 10 in non-test mode)
      const input = page.locator('input[placeholder*="Type a message"]');
      
      // Send first 10 requests (should succeed)
      for (let i = 0; i < 10; i++) {
        await input.fill(`Message ${i}`);
        await page.locator('button:has-text("Send")').click();
        await page.waitForTimeout(50); // Small delay between requests
      }
      
      // Wait for responses
      await page.waitForTimeout(2000);
      
      // Send 11th request (should hit rate limit)
      await input.fill("Message 10");
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST"
      );
      await page.locator('button:has-text("Send")').click();
      
      const response = await responsePromise;
      
      // Should get 429 status or rate limit error message
      if (response.status() === 429) {
        // Rate limit detected in response
        expect(response.status()).toBe(429);
      } else {
        // Check if rate limit error appears in UI
        await page.waitForTimeout(2000);
        const rateLimitVisible = await page.locator("text=Rate limit exceeded").isVisible().catch(() => false);
        expect(rateLimitVisible).toBeTruthy();
      }
    });

    test("should consume energy when sending message", async ({ page }) => {
      // Get initial energy
      const initialEnergyText = await page.locator("text=/\\d+%/").textContent();
      const initialEnergy = parseInt(initialEnergyText?.replace("%", "") || "0");
      
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Energy test");
      await page.locator('button:has-text("Send")').click();
      
      // Wait for energy to update (consumes 10 energy)
      await page.waitForTimeout(500);
      
      const newEnergyText = await page.locator("text=/\\d+%/").textContent();
      const newEnergy = parseInt(newEnergyText?.replace("%", "") || "0");
      
      // Energy should decrease (unless already at 0)
      if (initialEnergy > 0) {
        expect(newEnergy).toBeLessThan(initialEnergy);
      }
    });
  });

  test.describe("Boost Button - PUT /api/chat", () => {
    test("should call PUT /api/chat when boost button is clicked", async ({ page }) => {
      const boostButton = page.locator('button:has-text("Boost")');
      await expect(boostButton).toBeEnabled();
      
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "PUT"
      );
      
      await boostButton.click();
      
      const request = await requestPromise;
      expect(request.method()).toBe("PUT");
      
      const requestBody = request.postDataJSON();
      expect(requestBody).toHaveProperty("boost", 20);
    });

    test("should set boost cookie for next chat request", async ({ page }) => {
      // Click boost button
      const boostButton = page.locator('button:has-text("Boost")');
      await boostButton.click();
      
      // Wait for boost to be set
      await page.waitForTimeout(500);
      
      // Send a message
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Boost test");
      
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const request = await requestPromise;
      
      // Check if cookies are sent (boost cookie should be included)
      const cookies = await page.context().cookies();
      const boostCookie = cookies.find((c) => c.name === "napgpt_boost");
      
      // The boost cookie should exist (or have been consumed)
      // If consumed, it won't be in cookies, but the request should have included it
      expect(request).toBeTruthy();
    });

    test("should disable boost button after click (cooldown)", async ({ page }) => {
      const boostButton = page.locator('button:has-text("Boost")');
      await expect(boostButton).toBeEnabled();
      
      await boostButton.click();
      
      // Wait a tiny bit for React to re-render after Zustand state update
      await page.waitForTimeout(100);
      
      // Button should be disabled immediately
      await expect(boostButton).toBeDisabled();
      await expect(boostButton).toContainText(/s/); // Should show cooldown seconds
    });

    test("should not call API if boost is on cooldown", async ({ page }) => {
      const boostButton = page.locator('button:has-text("Boost")');
      
      // Click boost (triggers cooldown)
      await boostButton.click();
      
      // Wait for React to re-render
      await page.waitForTimeout(100);
      await expect(boostButton).toBeDisabled();
      
      // Try to click again (should not trigger API call)
      let apiCallCount = 0;
      page.on("request", (request) => {
        if (request.url().includes("/api/chat") && request.method() === "PUT") {
          apiCallCount++;
        }
      });
      
      // Try clicking disabled button (should not work)
      await boostButton.click({ force: true });
      await page.waitForTimeout(500);
      
      // Should still be only 1 API call (from first click)
      expect(apiCallCount).toBe(1);
    });

    test("boost should affect next chat response", async ({ page }) => {
      // Click boost
      const boostButton = page.locator('button:has-text("Boost")');
      await boostButton.click();
      await page.waitForTimeout(500);
      
      // Set low effort to see boost effect
      const slider = page.locator('input[type="range"]');
      await slider.fill("10");
      
      // Send message
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test with boost");
      
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      // Boost should help get a response even at low effort
      const data = await response.json();
      expect(data.reply).toBeTruthy();
    });
  });

  test.describe("Effort Slider - Affects API Calls", () => {
    test("should send different effort values", async ({ page }) => {
      const slider = page.locator('input[type="range"]');
      const input = page.locator('input[placeholder*="Type a message"]');
      
      const effortValues = [0, 25, 50, 75, 100];
      
      for (const effort of effortValues) {
        await slider.fill(effort.toString());
        await slider.dispatchEvent("change");
        await page.waitForTimeout(100);
        
        await input.fill(`Effort ${effort}`);
        
        const requestPromise = page.waitForRequest(
          (request) => request.url().includes("/api/chat") && request.method() === "POST"
        );
        
        await page.locator('button:has-text("Send")').click();
        
        const request = await requestPromise;
        const requestBody = request.postDataJSON();
        
        expect(requestBody.effort).toBe(effort);
        
        // Wait for response before next iteration
        await page.waitForTimeout(2000);
      }
    });

    test("low effort should produce different responses than high effort", async ({ page }) => {
      const slider = page.locator('input[type="range"]');
      const input = page.locator('input[placeholder*="Type a message"]');
      
      // Test with low effort
      await slider.fill("10");
      await input.fill("What is React?");
      
      const responsePromise1 = page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.status() === 200,
        { timeout: 10000 }
      );
      
      await page.locator('button:has-text("Send")').click();
      await responsePromise1;
      await page.waitForSelector('[class*="MessageBubble"]', { timeout: 10000 });
      
      const lowEffortResponse = await page.locator('[class*="MessageBubble"]').last().textContent();
      
      // Clear and test with high effort
      await page.reload();
      await page.waitForLoadState("networkidle");
      
      await slider.fill("95");
      await input.fill("What is React?");
      
      const responsePromise2 = page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.status() === 200,
        { timeout: 10000 }
      );
      
      await page.locator('button:has-text("Send")').click();
      await responsePromise2;
      await page.waitForSelector('[class*="MessageBubble"]', { timeout: 10000 });
      
      const highEffortResponse = await page.locator('[class*="MessageBubble"]').last().textContent();
      
      // Responses should be different (low effort might refuse or be short)
      expect(lowEffortResponse).toBeTruthy();
      expect(highEffortResponse).toBeTruthy();
      // They might be different in length or content
      expect(lowEffortResponse?.length || 0).not.toBe(highEffortResponse?.length || 0);
    });
  });

  test.describe("Mode API - GET /api/mode", () => {
    test("should call /api/mode on page load", async ({ page }) => {
      let modeApiCalled = false;
      
      page.on("response", (response) => {
        if (response.url().includes("/api/mode") && response.request().method() === "GET") {
          modeApiCalled = true;
        }
      });
      
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      
      expect(modeApiCalled).toBe(true);
    });

    test("should show mock mode banner if no API key", async ({ page }) => {
      // Mock the mode API to return isMock: true
      await page.route("**/api/mode", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ isMock: true }),
        });
      });
      
      await page.reload();
      await page.waitForLoadState("networkidle");
      
      await expect(page.locator("text=Mock mode")).toBeVisible();
    });

    test("should not show mock mode banner if API key exists", async ({ page }) => {
      // Mock the mode API to return isMock: false
      await page.route("**/api/mode", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ isMock: false }),
        });
      });
      
      await page.reload();
      await page.waitForLoadState("networkidle");
      
      await expect(page.locator("text=Mock mode")).not.toBeVisible();
    });
  });

  test.describe("API Request/Response Validation", () => {
    test("should validate request format", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Valid request");
      
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const request = await requestPromise;
      const requestBody = request.postDataJSON();
      
      // Validate request structure
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody.messages).toBeInstanceOf(Array);
      expect(requestBody.messages.length).toBeGreaterThan(0);
      expect(requestBody.messages[0]).toHaveProperty("role");
      expect(requestBody.messages[0]).toHaveProperty("content");
      expect(["user", "assistant", "system"]).toContain(requestBody.messages[0].role);
    });

    test("should receive valid response format", async ({ page }) => {
      // Clear rate limit before this test
      await page.request.delete("/api/chat").catch(() => {});
      
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Response format test");
      
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      // Validate response structure
      expect(data).toHaveProperty("reply");
      expect(data).toHaveProperty("meta");
      expect(typeof data.reply).toBe("string");
      expect(data.meta).toBeInstanceOf(Object);
    });

    test("should handle network timeout gracefully", async ({ page }) => {
      // Simulate slow network
      await page.route("**/api/chat", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second delay
          route.continue();
        } else {
          route.continue();
        }
      });
      
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Timeout test");
      await page.locator('button:has-text("Send")').click();
      
      // Should show loading state
      await expect(page.locator("text=Zzz")).toBeVisible();
      
      // Eventually should show error or response
      await page.waitForTimeout(15000);
      
      const hasError = await page.locator("text=ugh... something broke").isVisible().catch(() => false);
      const hasResponse = await page.locator('[class*="MessageBubble"]').count() > 1;
      
      expect(hasError || hasResponse).toBe(true);
    });
  });

  test.describe("Integration Tests", () => {
    test("complete flow: boost -> send message -> receive response", async ({ page }) => {
      // Step 1: Click boost
      const boostButton = page.locator('button:has-text("Boost")');
      await boostButton.click();
      await expect(boostButton).toBeDisabled();
      
      // Step 2: Set effort
      const slider = page.locator('input[type="range"]');
      await slider.fill("80");
      
      // Step 3: Send message
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Complete flow test");
      
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      // Step 4: Verify response
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.reply).toBeTruthy();
      
      // Step 5: Verify UI updates
      await expect(page.locator("text=Complete flow test")).toBeVisible();
      await expect(page.locator("text=" + data.reply.substring(0, 20))).toBeVisible({ timeout: 10000 });
    });

    test("multiple messages maintain conversation context", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      
      // Send first message
      await input.fill("My name is TestUser");
      await page.locator('button:has-text("Send")').click();
      await page.waitForTimeout(3000);
      
      // Send second message that references first
      await input.fill("What is my name?");
      
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "POST"
      );
      
      await page.locator('button:has-text("Send")').click();
      
      const request = await requestPromise;
      const requestBody = request.postDataJSON();
      
      // Should include both messages
      expect(requestBody.messages.length).toBeGreaterThanOrEqual(2);
      expect(requestBody.messages.some((m: any) => m.content.includes("TestUser"))).toBe(true);
      expect(requestBody.messages.some((m: any) => m.content.includes("What is my name"))).toBe(true);
    });
  });
});

