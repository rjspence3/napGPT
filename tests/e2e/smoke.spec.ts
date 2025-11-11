import { test, expect } from "@playwright/test";

test.describe("NapGPT Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear rate limit if in test mode
    await page.request.delete("/api/chat").catch(() => {});
  });

  test("loads the page and shows empty state", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1:has-text('NapGPT')")).toBeVisible();
    await expect(page.locator("text=The AI that just")).toBeVisible();
  });

  test("effort slider changes behavior", async ({ page }) => {
    await page.goto("/");

    // Set effort to 10 (should get refusal)
    const slider = page.locator('input[type="range"]');
    await slider.fill("10");
    await slider.dispatchEvent("change");

    // Send a message
    const input = page.locator('input[placeholder*="Type a message"]');
    await input.fill("Hello");
    
    // Wait for API response before checking messages
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/chat") && response.status() === 200,
      { timeout: 10000 }
    );
    
    await page.locator('button:has-text("Send")').click();
    
    // Wait for API response
    await responsePromise;

    // Wait for message to appear
    await page.waitForSelector('[class*="MessageBubble"]', { timeout: 10000 });
    const messages = page.locator('[class*="MessageBubble"]');
    await expect(messages.last()).toBeVisible({ timeout: 5000 });
    const lastMessage = messages.last();
    const text = await lastMessage.textContent();
    expect(text).toBeTruthy();
    expect(text?.toLowerCase()).toMatch(/meh|tired|nah|can't/i);
  });

  test("high effort produces helpful response", async ({ page }) => {
    await page.goto("/");

    // Set effort to 95
    const slider = page.locator('input[type="range"]');
    await slider.fill("95");
    await slider.dispatchEvent("change");

    // Send a message
    const input = page.locator('input[placeholder*="Type a message"]');
    await input.fill("What is React?");
    
    // Wait for API response before checking messages
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/chat") && response.status() === 200,
      { timeout: 10000 }
    );
    
    await page.locator('button:has-text("Send")').click();
    
    // Wait for API response
    await responsePromise;

    // Wait for message to appear
    await page.waitForSelector('[class*="MessageBubble"]', { timeout: 10000 });
    const messages = page.locator('[class*="MessageBubble"]');
    await expect(messages.last()).toBeVisible({ timeout: 5000 });
    const lastMessage = messages.last();
    const text = await lastMessage.textContent();
    expect(text).toBeTruthy();
    expect(text?.length).toBeGreaterThan(20);
  });

  test("boost button has cooldown", async ({ page }) => {
    await page.goto("/");

    const boostButton = page.locator('button:has-text("Boost")');
    await expect(boostButton).toBeEnabled();

    // Click boost
    await boostButton.click();
    
    // Wait for React to re-render after Zustand state update
    await page.waitForTimeout(100);

    // Should show cooldown
    await expect(boostButton).toBeDisabled();
    await expect(boostButton).toContainText(/s/); // Should show seconds
  });

  test("nap timer toggle works", async ({ page }) => {
    await page.goto("/");

    const napButton = page.locator('button:has-text("Nap Timer")');
    await expect(napButton).toBeVisible();

    // Toggle on
    await napButton.click();
    await expect(napButton).toHaveClass(/cozy-rose/);

    // Toggle off
    await napButton.click();
    await expect(napButton).toHaveClass(/cozy-amber/);
  });
});

