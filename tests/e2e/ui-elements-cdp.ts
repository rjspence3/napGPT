/**
 * Comprehensive UI Element Tests using Chrome DevTools Protocol
 * This script uses Puppeteer (same as chrome-devtools-mcp) to test all UI elements
 * 
 * Run with: npx tsx tests/e2e/ui-elements-cdp.ts
 * Or: npm run test:ui-cdp (after adding script to package.json)
 */

import puppeteer, { Browser, Page } from "puppeteer";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const HEADLESS = process.env.HEADLESS !== "false";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class UITester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private results: TestResult[] = [];

  async setup() {
    console.log("🚀 Starting browser...");
    this.browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    await this.page.goto(BASE_URL, { waitUntil: "networkidle2" });
    console.log("✅ Browser ready");
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async test(name: string, testFn: (page: Page) => Promise<void>) {
    try {
      if (!this.page) throw new Error("Page not initialized");
      await testFn(this.page);
      this.results.push({ name, passed: true });
      console.log(`✅ ${name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, error: errorMsg });
      console.log(`❌ ${name}: ${errorMsg}`);
    }
  }

  async takeScreenshot(name: string) {
    if (!this.page) return;
    await this.page.screenshot({
      path: `tests/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  printResults() {
    console.log("\n" + "=".repeat(60));
    console.log("TEST RESULTS");
    console.log("=".repeat(60));
    
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}`);
          if (r.error) console.log(`    Error: ${r.error}`);
        });
    }
    
    console.log("=".repeat(60) + "\n");
  }

  async runAllTests() {
    await this.setup();

    // Header Component Tests
    await this.test("Header: NapGPT title is visible", async (page) => {
      const title = await page.$("h1");
      if (!title) throw new Error("Title not found");
      const text = await page.evaluate((el) => el.textContent, title);
      if (text !== "NapGPT") throw new Error(`Expected 'NapGPT', got '${text}'`);
    });

    await this.test("Header: Has backdrop blur styling", async (page) => {
      const header = await page.$("header");
      if (!header) throw new Error("Header not found");
      const className = await page.evaluate((el) => el.className, header);
      if (!className.includes("backdrop-blur")) {
        throw new Error("Header missing backdrop-blur class");
      }
    });

    // EnergyMeter Component Tests
    await this.test("EnergyMeter: Energy label is visible", async (page) => {
      const energyLabel = await page.$("text=Energy");
      if (!energyLabel) throw new Error("Energy label not found");
    });

    await this.test("EnergyMeter: Shows energy percentage", async (page) => {
      const energyText = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("*"));
        const energyEl = elements.find((el) => {
          const text = el.textContent || "";
          return /^\d+%$/.test(text.trim());
        });
        return energyEl?.textContent || null;
      });
      if (!energyText || !/^\d+%$/.test(energyText.trim())) {
        throw new Error("Energy percentage not found or invalid format");
      }
    });

    await this.test("EnergyMeter: Progress bar exists", async (page) => {
      const progressBar = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("div"));
        return elements.some((el) => {
          const style = window.getComputedStyle(el);
          return (
            el.textContent?.includes("Energy") &&
            (style.width !== "auto" || el.querySelector("div[class*='bg-gradient']"))
          );
        });
      });
      if (!progressBar) throw new Error("Progress bar not found");
    });

    // ChatWindow - Empty State Tests
    await this.test("ChatWindow: Empty state message is visible", async (page) => {
      const emptyState = await page.$("text=The AI that just");
      if (!emptyState) throw new Error("Empty state message not found");
    });

    await this.test("ChatWindow: Empty state emoji is visible", async (page) => {
      const emoji = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("*"));
        return elements.some((el) => el.textContent?.includes("😴"));
      });
      if (!emoji) throw new Error("Empty state emoji not found");
    });

    await this.test("ChatWindow: Command hints are visible", async (page) => {
      const hasNap = await page.evaluate(() => {
        return document.body.textContent?.includes("/nap") || false;
      });
      const hasDream = await page.evaluate(() => {
        return document.body.textContent?.includes("/dream") || false;
      });
      if (!hasNap || !hasDream) {
        throw new Error("Command hints not found");
      }
    });

    // Input and Send Tests
    await this.test("ChatWindow: Input field is visible and enabled", async (page) => {
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input field not found");
      const isDisabled = await page.evaluate((el) => (el as HTMLInputElement).disabled, input);
      if (isDisabled) throw new Error("Input field is disabled");
    });

    await this.test("ChatWindow: Send button is visible", async (page) => {
      const sendButton = await page.$('button:has-text("Send")');
      if (!sendButton) throw new Error("Send button not found");
    });

    await this.test("ChatWindow: Send button disabled when input empty", async (page) => {
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      await page.evaluate((el) => ((el as HTMLInputElement).value = ""), input);
      await page.evaluate((el) => el.dispatchEvent(new Event("input")), input);
      await page.waitForTimeout(100);
      
      const sendButton = await page.$('button:has-text("Send")');
      if (!sendButton) throw new Error("Send button not found");
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, sendButton);
      if (!isDisabled) throw new Error("Send button should be disabled when input is empty");
    });

    await this.test("ChatWindow: Send button enabled when input has text", async (page) => {
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      await page.evaluate((el) => ((el as HTMLInputElement).value = "Test"), input);
      await page.evaluate((el) => el.dispatchEvent(new Event("input")), input);
      await page.waitForTimeout(100);
      
      const sendButton = await page.$('button:has-text("Send")');
      if (!sendButton) throw new Error("Send button not found");
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, sendButton);
      if (isDisabled) throw new Error("Send button should be enabled when input has text");
    });

    await this.test("ChatWindow: Can type and send message", async (page) => {
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      await input.type("Hello from CDP test");
      await page.keyboard.press("Enter");
      
      await page.waitForTimeout(500);
      
      const messageVisible = await page.evaluate(() => {
        return document.body.textContent?.includes("Hello from CDP test") || false;
      });
      if (!messageVisible) throw new Error("Message not visible after sending");
    });

    // EffortBar Tests
    await this.test("EffortBar: Slider is visible", async (page) => {
      const slider = await page.$('input[type="range"]');
      if (!slider) throw new Error("Effort slider not found");
    });

    await this.test("EffortBar: Effort level label is visible", async (page) => {
      const label = await page.evaluate(() => {
        return document.body.textContent?.match(/Effort Level: \d+/) !== null;
      });
      if (!label) throw new Error("Effort level label not found");
    });

    await this.test("EffortBar: Slider has correct min/max", async (page) => {
      const slider = await page.$('input[type="range"]');
      if (!slider) throw new Error("Slider not found");
      const min = await page.evaluate((el) => (el as HTMLInputElement).min, slider);
      const max = await page.evaluate((el) => (el as HTMLInputElement).max, slider);
      if (min !== "0" || max !== "100") {
        throw new Error(`Expected min=0, max=100, got min=${min}, max=${max}`);
      }
    });

    await this.test("EffortBar: Can change effort level", async (page) => {
      const slider = await page.$('input[type="range"]');
      if (!slider) throw new Error("Slider not found");
      
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "75";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider);
      
      await page.waitForTimeout(200);
      
      const labelText = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("*"));
        const labelEl = elements.find((el) => {
          const text = el.textContent || "";
          return text.includes("Effort Level: 75");
        });
        return labelEl?.textContent || null;
      });
      
      if (!labelText || !labelText.includes("75")) {
        throw new Error("Effort level did not update to 75");
      }
    });

    await this.test("EffortBar: Boost button is visible", async (page) => {
      const boostButton = await page.$('button:has-text("Boost")');
      if (!boostButton) throw new Error("Boost button not found");
    });

    await this.test("EffortBar: Boost button shows cooldown after click", async (page) => {
      const boostButton = await page.$('button:has-text("Boost")');
      if (!boostButton) throw new Error("Boost button not found");
      
      await page.evaluate((el) => el.click(), boostButton);
      await page.waitForTimeout(500);
      
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, boostButton);
      if (!isDisabled) throw new Error("Boost button should be disabled after click");
      
      const buttonText = await page.evaluate((el) => el.textContent, boostButton);
      if (!buttonText?.includes("s")) {
        throw new Error("Boost button should show cooldown in seconds");
      }
    });

    await this.test("EffortBar: Nap Timer button is visible", async (page) => {
      const napButton = await page.$('button:has-text("Nap Timer")');
      if (!napButton) throw new Error("Nap Timer button not found");
    });

    await this.test("EffortBar: Nap Timer button toggles", async (page) => {
      const napButton = await page.$('button:has-text("Nap Timer")');
      if (!napButton) throw new Error("Nap Timer button not found");
      
      const initialClass = await page.evaluate((el) => el.className, napButton);
      const isInitiallyActive = initialClass.includes("cozy-rose");
      
      await page.evaluate((el) => el.click(), napButton);
      await page.waitForTimeout(200);
      
      const newClass = await page.evaluate((el) => el.className, napButton);
      const isNowActive = newClass.includes("cozy-rose");
      
      if (isNowActive === isInitiallyActive) {
        throw new Error("Nap Timer button state did not toggle");
      }
    });

    // Commands Tests
    await this.test("Commands: /nap command triggers nap animation", async (page) => {
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      await input.type("/nap");
      await page.keyboard.press("Enter");
      
      await page.waitForTimeout(500);
      
      const napEmoji = await page.evaluate(() => {
        return document.body.textContent?.includes("💤") || false;
      });
      if (!napEmoji) throw new Error("Nap animation not triggered");
    });

    // Accessibility Tests
    await this.test("Accessibility: Input has aria-label", async (page) => {
      const input = await page.$('input[aria-label="Message input"]');
      if (!input) throw new Error("Input missing aria-label");
    });

    await this.test("Accessibility: Send button has aria-label", async (page) => {
      const sendButton = await page.$('button[aria-label="Send message"]');
      if (!sendButton) throw new Error("Send button missing aria-label");
    });

    await this.test("Accessibility: Slider has aria-label", async (page) => {
      const slider = await page.$('input[aria-label="Effort Level"]');
      if (!slider) throw new Error("Slider missing aria-label");
    });

    // Visual Tests
    await this.test("Visual: Cozy theme classes are applied", async (page) => {
      const header = await page.$("header");
      if (!header) throw new Error("Header not found");
      const className = await page.evaluate((el) => el.className, header);
      if (!className.includes("cozy")) {
        throw new Error("Header missing cozy theme classes");
      }
    });

    await this.test("Visual: Footer has cozy theme", async (page) => {
      const footer = await page.$("footer");
      if (!footer) throw new Error("Footer not found");
      const className = await page.evaluate((el) => el.className, footer);
      if (!className.includes("cozy")) {
        throw new Error("Footer missing cozy theme classes");
      }
    });

    // Take final screenshot
    await this.takeScreenshot("final-state");

    this.printResults();
    await this.teardown();

    // Exit with error code if any tests failed
    const failed = this.results.filter((r) => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new UITester();
tester.runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


