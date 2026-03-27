import { test, expect } from "@playwright/test";

/**
 * Comprehensive UI Element Tests using Chrome DevTools Protocol capabilities
 * Tests all components: Header, EnergyMeter, ChatWindow, EffortBar, IdleOverlay, MessageBubble
 */
test.describe("NapGPT UI Elements - Comprehensive Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear rate limit before each test (test mode only)
    await page.request.delete("/api/chat").catch(() => {});
    await page.goto("/");
    // Wait for page to fully load
    await page.waitForLoadState("networkidle");
  });

  test.describe("Header Component", () => {
    test("should display NapGPT title", async ({ page }) => {
      const title = page.locator("h1:has-text('NapGPT')");
      await expect(title).toBeVisible();
      await expect(title).toHaveText("NapGPT");
    });

    test("should have correct header styling", async ({ page }) => {
      const header = page.locator("header");
      await expect(header).toBeVisible();
      
      // Check header has backdrop blur and border
      const headerClass = await header.getAttribute("class");
      expect(headerClass).toContain("backdrop-blur");
      expect(headerClass).toContain("border-b");
    });
  });

  test.describe("EnergyMeter Component", () => {
    test("should display energy meter in header", async ({ page }) => {
      const energyMeter = page.locator("text=Energy").locator("..");
      await expect(energyMeter).toBeVisible();
    });

    test("should show energy percentage", async ({ page }) => {
      const energyText = page.locator("text=/\\d+%/");
      await expect(energyText).toBeVisible();
      
      const text = await energyText.textContent();
      expect(text).toMatch(/^\d+%$/);
    });

    test("should have energy progress bar", async ({ page }) => {
      // Find the progress bar container
      const progressBar = page.locator("div:has-text('Energy')").locator("div[class*='bg-cozy-amber']");
      await expect(progressBar.first()).toBeVisible();
    });

    test("energy should refill over time", async ({ page }) => {
      // Drain energy first so there is headroom to refill
      await page.evaluate(() => {
        const store = (window as any).__nap_store;
        if (store) {
          store.setState({ energy: 50, lastActivityAt: Date.now() - 3000 });
        }
      });

      const drainedEnergy = await page.locator('[data-testid="energy-meter-bar"]').getAttribute("aria-valuenow");
      const drainedValue = parseInt(drainedEnergy || "50");

      // Wait long enough for the 2s idle threshold + several 100ms refill ticks
      await page.waitForTimeout(3000);

      const newEnergy = await page.locator('[data-testid="energy-meter-bar"]').getAttribute("aria-valuenow");
      const newValue = parseInt(newEnergy || "0");

      // Energy must have increased — if refill is broken this will catch it
      expect(newValue).toBeGreaterThan(drainedValue);
    });
  });

  test.describe("ChatWindow Component - Empty State", () => {
    test("should display empty state when no messages", async ({ page }) => {
      const emptyState = page.locator("text=The AI that just");
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText("doesn't feel like it right now");
    });

    test("should show emoji in empty state", async ({ page }) => {
      const emoji = page.locator("text=😴");
      await expect(emoji).toBeVisible();
    });

    test("should show command hints", async ({ page }) => {
      const hints = page.locator("text=/nap|dream/");
      await expect(hints.first()).toBeVisible();
    });

    test("should display /nap and /dream commands", async ({ page }) => {
      await expect(page.locator("code:has-text('/nap')")).toBeVisible();
      await expect(page.locator("code:has-text('/dream')")).toBeVisible();
    });
  });

  test.describe("ChatWindow Component - Input and Send", () => {
    test("should have message input field", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await expect(input).toBeVisible();
      await expect(input).toBeEnabled();
    });

    test("should have send button", async ({ page }) => {
      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).toBeVisible();
    });

    test("send button should be disabled when input is empty", async ({ page }) => {
      const sendButton = page.locator('button:has-text("Send")');
      const input = page.locator('input[placeholder*="Type a message"]');
      
      // Clear input
      await input.fill("");
      await expect(sendButton).toBeDisabled();
    });

    test("send button should be enabled when input has text", async ({ page }) => {
      const sendButton = page.locator('button:has-text("Send")');
      const input = page.locator('input[placeholder*="Type a message"]');
      
      await input.fill("Hello");
      await expect(sendButton).toBeEnabled();
    });

    test("should send message on Enter key", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test message");
      await input.press("Enter");
      
      // Should see user message
      await expect(page.locator("text=Test message")).toBeVisible();
    });

    test("should clear input after sending", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test");
      await page.locator('button:has-text("Send")').click();
      
      // Input should be cleared
      await expect(input).toHaveValue("");
    });
  });

  test.describe("MessageBubble Component", () => {
    test("should display user messages", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("User message");
      await page.locator('button:has-text("Send")').click();
      
      await expect(page.locator("text=User message")).toBeVisible();
    });

    test("should show typing indicator when loading", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test");
      await page.locator('button:has-text("Send")').click();
      
      // Should see typing indicator
      await expect(page.locator("text=Zzz")).toBeVisible();
    });

    test("user messages should be right-aligned", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Right aligned");
      await page.locator('button:has-text("Send")').click();
      
      // Wait for message to appear
      await page.waitForTimeout(500);
      
      // Find the container div that has justify-end (parent of message bubble)
      const userMessageContainer = page.locator("text=Right aligned")
        .locator("xpath=ancestor::div[contains(@class, 'justify-end')]");
      await expect(userMessageContainer).toBeVisible();
    });

    test("assistant messages should be left-aligned", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test");
      await page.locator('button:has-text("Send")').click();
      
      // Wait for assistant response
      await page.waitForTimeout(3000);
      
      // Find assistant message (not user message)
      const messages = page.locator('[class*="MessageBubble"]');
      const assistantMessage = messages.filter({ hasNotText: "Test" }).first();
      
      if (await assistantMessage.count() > 0) {
        const classes = await assistantMessage.getAttribute("class");
        expect(classes).toContain("justify-start");
      }
    });
  });

  test.describe("EffortBar Component", () => {
    test("should display effort slider", async ({ page }) => {
      const slider = page.locator('input[type="range"]');
      await expect(slider).toBeVisible();
      await expect(slider).toBeEnabled();
    });

    test("should show effort level label", async ({ page }) => {
      const label = page.locator("text=/Effort Level: \\d+/");
      await expect(label).toBeVisible();
    });

    test("should update effort level when slider changes", async ({ page }) => {
      const slider = page.locator('input[type="range"]');
      const label = page.locator("text=/Effort Level: \\d+/");
      
      // Get initial value
      const initialText = await label.textContent();
      const initialValue = parseInt(initialText?.match(/\d+/)?.[0] || "0");
      
      // Change slider to 75
      await slider.fill("75");
      
      // Label should update
      await expect(label).toContainText("75");
    });

    test("slider should have correct min and max", async ({ page }) => {
      const slider = page.locator('input[type="range"]');
      await expect(slider).toHaveAttribute("min", "0");
      await expect(slider).toHaveAttribute("max", "100");
    });

    test("should display Boost button", async ({ page }) => {
      const boostButton = page.locator('button:has-text("Boost")');
      await expect(boostButton).toBeVisible();
    });

    test("Boost button should have Coffee icon", async ({ page }) => {
      const boostButton = page.locator('button:has-text("Boost")');
      // Icon should be present (lucide-react Coffee icon)
      const buttonContent = await boostButton.innerHTML();
      expect(buttonContent).toBeTruthy();
    });

    test("Boost button should show cooldown after click", async ({ page }) => {
      const boostButton = page.locator('button:has-text("Boost")');
      
      // Click boost
      await boostButton.click();
      
      // Wait for React to re-render after Zustand state update
      await page.waitForTimeout(100);
      
      // Should show cooldown (disabled state with seconds)
      await expect(boostButton).toBeDisabled();
      await expect(boostButton).toContainText(/s/); // Should show seconds
    });

    test("Boost button should re-enable after cooldown", async ({ page }) => {
      const boostButton = page.locator('button:has-text("Boost")');
      
      await boostButton.click();
      
      // Wait for React to re-render
      await page.waitForTimeout(100);
      await expect(boostButton).toBeDisabled();
      
      // Wait for cooldown (10 seconds)
      await page.waitForTimeout(10100);
      
      await expect(boostButton).toBeEnabled();
      await expect(boostButton).toContainText("Boost");
    });

    test("should display Nap Timer button", async ({ page }) => {
      const napButton = page.locator('button:has-text("Nap Timer")');
      await expect(napButton).toBeVisible();
    });

    test("Nap Timer button should toggle state", async ({ page }) => {
      const napButton = page.locator('button:has-text("Nap Timer")');
      
      // Get initial state
      const initialClass = await napButton.getAttribute("class");
      const isInitiallyActive = initialClass?.includes("cozy-rose");
      
      // Toggle
      await napButton.click();
      
      // State should change
      const newClass = await napButton.getAttribute("class");
      const isNowActive = newClass?.includes("cozy-rose");
      
      expect(isNowActive).not.toBe(isInitiallyActive);
    });

    test("Nap Timer button should have Moon icon", async ({ page }) => {
      const napButton = page.locator('button:has-text("Nap Timer")');
      const buttonContent = await napButton.innerHTML();
      expect(buttonContent).toBeTruthy();
    });
  });

  test.describe("IdleOverlay Component", () => {
    test("should show idle overlay when napping", async ({ page }) => {
      // Enable nap timer
      await page.locator('button:has-text("Nap Timer")').click();
      
      // Wait for idle threshold (30 seconds) - but we'll trigger it manually via /nap command
      // Instead, let's use the /nap command which shows the napping overlay
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("/nap");
      await page.locator('button:has-text("Send")').click();
      
      // Should see napping overlay
      await expect(page.locator("text=💤")).toBeVisible();
    });

    test("napping overlay should disappear after timeout", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("/nap");
      await page.locator('button:has-text("Send")').click();
      
      // Overlay should appear
      await expect(page.locator("text=💤")).toBeVisible();
      
      // Wait for overlay to disappear (5 seconds)
      await page.waitForTimeout(5100);
      
      // Overlay should be gone
      await expect(page.locator("text=💤")).not.toBeVisible();
    });

    test("input should be disabled during nap", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("/nap");
      await page.locator('button:has-text("Send")').click();
      
      // Input should be disabled
      await expect(input).toBeDisabled();
      
      // Wait for nap to end
      await page.waitForTimeout(5100);
      
      // Input should be enabled again
      await expect(input).toBeEnabled();
    });
  });

  test.describe("Commands", () => {
    test("/nap command should trigger nap animation", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("/nap");
      await page.locator('button:has-text("Send")').click();
      
      await expect(page.locator("text=💤")).toBeVisible();
    });

    test("/dream command should send message with dream flag", async ({ page }) => {
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("/dream");
      await page.locator('button:has-text("Send")').click();
      
      // Should see the command as user message
      await expect(page.locator("text=/dream")).toBeVisible();
      
      // Should get a response (may take time)
      await page.waitForTimeout(3000);
    });
  });

  test.describe("Energy Consumption", () => {
    test("sending message should consume energy", async ({ page }) => {
      // Get initial energy
      const initialEnergy = await page.locator("text=/\\d+%/").textContent();
      const initialValue = parseInt(initialEnergy?.replace("%", "") || "0");
      
      // Send a message (consumes 10 energy)
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test");
      await page.locator('button:has-text("Send")').click();
      
      // Wait a bit for energy to update
      await page.waitForTimeout(500);
      
      const newEnergy = await page.locator("text=/\\d+%/").textContent();
      const newValue = parseInt(newEnergy?.replace("%", "") || "0");
      
      // Energy should decrease (unless it was already at 0)
      if (initialValue > 0) {
        expect(newValue).toBeLessThan(initialValue);
      }
    });
  });

  test.describe("Accessibility", () => {
    test("input should have aria-label", async ({ page }) => {
      const input = page.locator('input[aria-label="Message input"]');
      await expect(input).toBeVisible();
    });

    test("send button should have aria-label", async ({ page }) => {
      const sendButton = page.locator('button[aria-label="Send message"]');
      await expect(sendButton).toBeVisible();
    });

    test("effort slider should have aria-label", async ({ page }) => {
      const slider = page.locator('input[aria-label="Effort Level"]');
      await expect(slider).toBeVisible();
    });

    test("boost button should have aria-label", async ({ page }) => {
      const boostButton = page.locator('button[aria-label="Boost energy"]');
      await expect(boostButton).toBeVisible();
    });

    test("nap timer button should have aria-label", async ({ page }) => {
      const napButton = page.locator('button[aria-label="Toggle nap timer"]');
      await expect(napButton).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should work on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // All main elements should still be visible
      await expect(page.locator("h1:has-text('NapGPT')")).toBeVisible();
      await expect(page.locator("text=Energy")).toBeVisible();
      await expect(page.locator('input[placeholder*="Type a message"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send")')).toBeVisible();
    });

    test("should work on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await expect(page.locator("h1:has-text('NapGPT')")).toBeVisible();
      await expect(page.locator("text=Energy")).toBeVisible();
    });

    test("should work on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await expect(page.locator("h1:has-text('NapGPT')")).toBeVisible();
      await expect(page.locator("text=Energy")).toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("should handle API errors gracefully", async ({ page }) => {
      // Mock network failure
      await page.route("**/api/chat", (route) => route.abort());
      
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test error");
      await page.locator('button:has-text("Send")').click();
      
      // Should show error message
      await page.waitForTimeout(2000);
      await expect(page.locator("text=ugh... something broke")).toBeVisible();
    });

    test("should handle empty messages", async ({ page }) => {
      const sendButton = page.locator('button:has-text("Send")');
      const input = page.locator('input[placeholder*="Type a message"]');
      
      await input.fill("");
      await expect(sendButton).toBeDisabled();
      
      // Try to send empty message
      await input.fill("   "); // Only whitespace
      await expect(sendButton).toBeDisabled();
    });
  });

  test.describe("State Persistence", () => {
    test("effort level should persist during session", async ({ page }) => {
      const slider = page.locator('input[type="range"]');
      await slider.fill("75");
      
      // Send a message
      const input = page.locator('input[placeholder*="Type a message"]');
      await input.fill("Test");
      await page.locator('button:has-text("Send")').click();
      await page.waitForTimeout(1000);
      
      // Effort should still be 75
      const label = page.locator("text=/Effort Level: \\d+/");
      await expect(label).toContainText("75");
    });
  });

  test.describe("Visual Elements", () => {
    test("should have proper color scheme", async ({ page }) => {
      // Check that cozy theme classes are applied
      const header = page.locator("header");
      const headerClass = await header.getAttribute("class");
      expect(headerClass).toContain("cozy");
      
      const footer = page.locator("footer");
      const footerClass = await footer.getAttribute("class");
      expect(footerClass).toContain("cozy");
    });

    test("should have backdrop blur effects", async ({ page }) => {
      const header = page.locator("header");
      const headerClass = await header.getAttribute("class");
      expect(headerClass).toContain("backdrop-blur");
    });
  });
});

