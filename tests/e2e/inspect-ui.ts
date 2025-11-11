/**
 * Quick UI Inspection Script
 * Checks the current state of the UI and reports findings
 */

import puppeteer from "puppeteer";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const HEADLESS = process.env.HEADLESS !== "false";

async function inspectUI() {
  console.log("🔍 Inspecting NapGPT UI...\n");
  
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 10000 });
    console.log("✅ Page loaded successfully\n");
    
    // Check Header
    console.log("📋 HEADER:");
    const title = await page.$("h1");
    if (title) {
      const titleText = await page.evaluate((el) => el.textContent, title);
      console.log(`  ✅ Title: ${titleText}`);
    } else {
      console.log("  ❌ Title not found");
    }
    
    // Check EnergyMeter
    console.log("\n⚡ ENERGY METER:");
    const energyText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll("*"));
      const energyEl = elements.find((el) => {
        const text = el.textContent || "";
        return /^\d+%$/.test(text.trim());
      });
      return energyEl?.textContent || null;
    });
    if (energyText) {
      console.log(`  ✅ Energy: ${energyText}`);
    } else {
      console.log("  ❌ Energy meter not found");
    }
    
    // Check Empty State
    console.log("\n💬 CHAT WINDOW:");
    const emptyState = await page.$("text=The AI that just");
    if (emptyState) {
      console.log("  ✅ Empty state visible");
      const emptyText = await page.evaluate((el) => el.textContent, emptyState);
      console.log(`  📝 Text: "${emptyText?.substring(0, 50)}..."`);
    } else {
      console.log("  ⚠️  Empty state not found (may have messages)");
    }
    
    // Check Input Field
    const input = await page.$('input[placeholder*="Type a message"]');
    if (input) {
      console.log("  ✅ Input field found");
      const placeholder = await page.evaluate((el) => (el as HTMLInputElement).placeholder, input);
      console.log(`  📝 Placeholder: "${placeholder}"`);
      const isDisabled = await page.evaluate((el) => (el as HTMLInputElement).disabled, input);
      console.log(`  🔓 Disabled: ${isDisabled}`);
    } else {
      console.log("  ❌ Input field not found");
    }
    
    // Check Send Button
    const sendButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((btn) => btn.textContent?.includes("Send")) || null;
    });
    if (sendButton && (await sendButton.asElement())) {
      const sendButtonEl = await sendButton.asElement()!;
      console.log("  ✅ Send button found");
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, sendButtonEl);
      console.log(`  🔓 Disabled: ${isDisabled}`);
    } else {
      console.log("  ❌ Send button not found");
    }
    
    // Check Messages
    const messages = await page.evaluate(() => {
      const messageElements = Array.from(document.querySelectorAll('[class*="MessageBubble"], [class*="message"]'));
      return messageElements.length;
    });
    console.log(`  📨 Messages visible: ${messages}`);
    
    // Check EffortBar
    console.log("\n🎚️  EFFORT BAR:");
    const slider = await page.$('input[type="range"]');
    if (slider) {
      console.log("  ✅ Effort slider found");
      const value = await page.evaluate((el) => (el as HTMLInputElement).value, slider);
      const min = await page.evaluate((el) => (el as HTMLInputElement).min, slider);
      const max = await page.evaluate((el) => (el as HTMLInputElement).max, slider);
      console.log(`  📊 Value: ${value} (range: ${min}-${max})`);
    } else {
      console.log("  ❌ Effort slider not found");
    }
    
    // Check Boost Button
    const boostButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((btn) => btn.textContent?.includes("Boost")) || null;
    });
    if (boostButton && (await boostButton.asElement())) {
      const boostButtonEl = await boostButton.asElement()!;
      console.log("  ✅ Boost button found");
      const buttonText = await page.evaluate((el) => el.textContent, boostButtonEl);
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, boostButtonEl);
      console.log(`  📝 Text: "${buttonText}"`);
      console.log(`  🔓 Disabled: ${isDisabled}`);
    } else {
      console.log("  ❌ Boost button not found");
    }
    
    // Check Nap Timer Button
    const napButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((btn) => btn.textContent?.includes("Nap Timer")) || null;
    });
    if (napButton && (await napButton.asElement())) {
      const napButtonEl = await napButton.asElement()!;
      console.log("  ✅ Nap Timer button found");
      const buttonText = await page.evaluate((el) => el.textContent, napButtonEl);
      console.log(`  📝 Text: "${buttonText}"`);
    } else {
      console.log("  ❌ Nap Timer button not found");
    }
    
    // Check for Mock Mode Banner
    console.log("\n🔧 CONFIGURATION:");
    const mockMode = await page.$("text=Mock mode");
    if (mockMode) {
      console.log("  ⚠️  Mock mode enabled (no API key)");
    } else {
      console.log("  ✅ Production mode (API key configured)");
    }
    
    // Take screenshot
    await page.screenshot({
      path: "tests/screenshots/inspection.png",
      fullPage: true,
    });
    console.log("\n📸 Screenshot saved to tests/screenshots/inspection.png");
    
    // Check for any errors in console
    console.log("\n🔍 CONSOLE:");
    const consoleMessages: string[] = [];
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "error") {
        consoleMessages.push(`  ❌ Error: ${text}`);
      }
    });
    
    // Wait a bit for console messages
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (consoleMessages.length > 0) {
      consoleMessages.forEach((msg) => console.log(msg));
    } else {
      console.log("  ✅ No console errors detected");
    }
    
    // Check page title
    const pageTitle = await page.title();
    console.log(`\n📄 Page Title: "${pageTitle}"`);
    
    // Check URL
    const url = page.url();
    console.log(`🌐 URL: ${url}`);
    
  } catch (error) {
    console.error("❌ Error inspecting UI:", error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
  } finally {
    await browser.close();
    console.log("\n✅ Inspection complete");
  }
}

inspectUI().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

