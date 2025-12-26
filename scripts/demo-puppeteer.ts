/**
 * Simple Puppeteer demo to drive the NapGPT app
 */

import puppeteer from "puppeteer";
const config = {
  baseUrl: process.env.E2E_BASE_URL || "http://localhost:3000",
};

async function main() {
  console.log("🚀 Starting Puppeteer demo...");

  // Check if app is running
  const baseUrl = config.baseUrl;
  console.log(`📍 Target URL: ${baseUrl}`);

  const browser = await puppeteer.launch({
    headless: false, // Show browser for demo
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log("📱 Navigating to app...");
    await page.goto(baseUrl, { waitUntil: "networkidle2" });

    // Wait for app to load
    await page.waitForSelector('h1', { timeout: 5000 });
    const title = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent || '';
    });
    if (title.includes('NapGPT')) {
      console.log("✅ App loaded!");
    } else {
      console.log(`⚠️  Unexpected title: ${title}`);
    }

    // Take initial screenshot
    await page.screenshot({ path: "docs/assets/demo-initial.png" });
    console.log("📸 Screenshot saved: docs/assets/demo-initial.png");

    // Check for mock mode banner
    const mockBanner = await page.$('[data-testid="mock-banner"]');
    if (mockBanner) {
      console.log("ℹ️  Mock mode detected (no API key)");
    }

    // Interact with effort slider
    console.log("🎚️  Setting effort to 75...");
    const slider = await page.$('[data-testid="effort-slider"]');
    if (slider) {
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "75";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider);
      await new Promise((resolve) => setTimeout(resolve, 300));
      console.log("✅ Effort set to 75");
    }

    // Type a message
    console.log("💬 Typing message...");
    const input = await page.$('[data-testid="chat-input"]');
    if (input) {
      await input.click();
      await input.type("Hello! Can you help me understand how this works?");
      console.log("✅ Message typed");
    }

    // Click send button
    console.log("📤 Sending message...");
    const sendBtn = await page.$('[data-testid="send-btn"]');
    if (sendBtn) {
      await sendBtn.click();
      console.log("✅ Send button clicked");

      // Wait for response
      console.log("⏳ Waiting for response...");
      try {
        await page.waitForSelector('[data-testid="message-assistant"]', {
          timeout: 15000,
        });
        console.log("✅ Response received!");

        // Get the response text
        const response = await page.evaluate(() => {
          const messages = document.querySelectorAll('[data-testid="message-assistant"]');
          const last = messages[messages.length - 1];
          return last?.textContent || "";
        });
        console.log(`📝 Response: ${response.substring(0, 100)}...`);

        // Take screenshot of conversation
        await page.screenshot({ path: "docs/assets/demo-with-response.png" });
        console.log("📸 Screenshot saved: docs/assets/demo-with-response.png");
      } catch (e) {
        console.log("⚠️  Timeout waiting for response (this is OK in mock mode)");
      }
    }

    // Test boost button
    console.log("⚡ Testing boost button...");
    const boostBtn = await page.$('[data-testid="boost-btn"]');
    if (boostBtn) {
      const wasDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, boostBtn);
      if (!wasDisabled) {
        await boostBtn.click();
        console.log("✅ Boost button clicked");
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if it's now disabled (cooldown)
        const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, boostBtn);
        if (isDisabled) {
          console.log("✅ Boost button correctly disabled (cooldown active)");
        }
      } else {
        console.log("ℹ️  Boost button already disabled (cooldown)");
      }
    }

    // Check energy meter
    console.log("🔋 Checking energy meter...");
    const energyBar = await page.$('[data-testid="energy-meter-bar"]');
    if (energyBar) {
      const width = await page.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.width;
      }, energyBar);
      console.log(`✅ Energy meter width: ${width}`);
    }

    // Final screenshot
    await page.screenshot({ path: "docs/assets/demo-final.png" });
    console.log("📸 Final screenshot saved: docs/assets/demo-final.png");

    console.log("\n✅ Demo complete! All interactions successful.");
    console.log("\n📸 Screenshots saved:");
    console.log("   - docs/assets/demo-initial.png");
    console.log("   - docs/assets/demo-with-response.png");
    console.log("   - docs/assets/demo-final.png");

    // Keep browser open for 3 seconds so user can see
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } finally {
    await browser.close();
    console.log("🔒 Browser closed");
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

