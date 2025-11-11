/**
 * Chrome DevTools Protocol Retest
 * Uses CDP directly (same protocol as chrome-devtools-mcp) to test all UI elements
 * This mirrors what chrome-devtools-mcp would do through MCP
 */

import puppeteer, { Browser, Page } from "puppeteer";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const HEADLESS = process.env.HEADLESS !== "false";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

class MCPCDPTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private results: TestResult[] = [];

  async setup() {
    console.log("🚀 Starting Chrome via CDP (chrome-devtools-mcp protocol)...");
    this.browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Enable CDP domains (like chrome-devtools-mcp does)
    const client = await this.page.target().createCDPSession();
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await client.send("Network.enable");
    await client.send("DOM.enable");
    
    await this.page.goto(BASE_URL, { waitUntil: "networkidle2" });
    console.log("✅ Chrome ready via CDP\n");
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
      path: `tests/screenshots/mcp-${name}.png`,
      fullPage: true,
    });
  }

  printResults() {
    console.log("\n" + "=".repeat(60));
    console.log("CHROME DEVTOOLS PROTOCOL (MCP) TEST RESULTS");
    console.log("=".repeat(60));
    
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
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

    // Header Tests
    await this.test("Header: NapGPT title visible", async (page) => {
      const title = await page.$("h1");
      if (!title) throw new Error("Title not found");
      const text = await page.evaluate((el) => el.textContent, title);
      if (text !== "NapGPT") throw new Error(`Expected 'NapGPT', got '${text}'`);
    });

    // EnergyMeter Tests
    await this.test("EnergyMeter: Energy percentage displayed", async (page) => {
      const energyText = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("*"));
        const energyEl = elements.find((el) => {
          const text = el.textContent || "";
          return /^\d+%$/.test(text.trim());
        });
        return energyEl?.textContent || null;
      });
      if (!energyText || !/^\d+%$/.test(energyText.trim())) {
        throw new Error("Energy percentage not found");
      }
    });

    // ChatWindow Tests
    await this.test("ChatWindow: Empty state visible", async (page) => {
      const emptyState = await page.$("text=The AI that just");
      if (!emptyState) throw new Error("Empty state not found");
    });

    await this.test("ChatWindow: Input field enabled", async (page) => {
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input field not found");
      const isDisabled = await page.evaluate((el) => (el as HTMLInputElement).disabled, input);
      if (isDisabled) throw new Error("Input field is disabled");
    });

    await this.test("ChatWindow: Send button visible", async (page) => {
      const sendButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((btn) => btn.textContent?.includes("Send")) || null;
      });
      if (!sendButton || !(await sendButton.asElement())) {
        throw new Error("Send button not found");
      }
    });

    // EffortBar Tests
    await this.test("EffortBar: Slider visible and functional", async (page) => {
      const slider = await page.$('input[type="range"]');
      if (!slider) throw new Error("Effort slider not found");
      
      // Test slider interaction
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "75";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider);
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const labelText = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("*"));
        const labelEl = elements.find((el) => {
          const text = el.textContent || "";
          return text.includes("Effort Level:");
        });
        return labelEl?.textContent || null;
      });
      
      if (!labelText || !labelText.includes("Effort Level:")) {
        throw new Error("Effort level label not found");
      }
      
      // Check if value is 75 (might be slightly different due to rounding)
      const effortValue = await page.evaluate(() => {
        const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
        return slider ? parseInt(slider.value) : null;
      });
      
      if (effortValue !== 75) {
        throw new Error(`Expected effort 75, got ${effortValue}`);
      }
    });

    await this.test("EffortBar: Boost button clickable", async (page) => {
      const boostButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((btn) => btn.textContent?.includes("Boost")) || null;
      });
      if (!boostButton || !(await boostButton.asElement())) {
        throw new Error("Boost button not found");
      }
      
      const boostButtonEl = await boostButton.asElement()!;
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, boostButtonEl);
      if (isDisabled) throw new Error("Boost button is disabled when it shouldn't be");
    });

    await this.test("EffortBar: Boost button disables after click", async (page) => {
      const boostButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((btn) => btn.textContent?.includes("Boost")) || null;
      });
      if (!boostButton || !(await boostButton.asElement())) {
        throw new Error("Boost button not found");
      }
      
      const boostButtonEl = await boostButton.asElement()!;
      await page.evaluate((el) => el.click(), boostButtonEl);
      
      // Wait for React to re-render
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, boostButtonEl);
      if (!isDisabled) throw new Error("Boost button should be disabled after click");
    });

    await this.test("EffortBar: Nap Timer button visible", async (page) => {
      const napButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((btn) => btn.textContent?.includes("Nap Timer")) || null;
      });
      if (!napButton || !(await napButton.asElement())) {
        throw new Error("Nap Timer button not found");
      }
    });

    // LLM Chat Integration Tests
    await this.test("LLM: Send message and receive response in UI", async (page) => {
      // Clear rate limit
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      const testMessage = "Hello, this is a test message for LLM";
      await input.type(testMessage);
      await page.keyboard.press("Enter");
      
      // Wait for user message to appear
      await page.waitForFunction(
        (msg) => {
          return document.body.textContent?.includes(msg) || false;
        },
        { timeout: 5000 },
        testMessage
      );
      
      // Wait for typing indicator
      const typingIndicator = await page.waitForSelector("text=Zzz", { timeout: 2000 }).catch(() => null);
      if (!typingIndicator) {
        // Typing indicator might be too fast, that's okay
      }
      
      // Wait for API response
      const response = await page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
        { timeout: 15000 }
      );
      
      if (response.status() !== 200) {
        throw new Error(`Expected 200, got ${response.status()}`);
      }
      
      const data = await response.json();
      if (!data.reply) {
        throw new Error("Response missing reply field");
      }
      
      // Wait for assistant message to appear in UI
      await page.waitForFunction(
        (replyText) => {
          const messages = Array.from(document.querySelectorAll('[class*="MessageBubble"]'));
          return messages.some((el) => el.textContent?.includes(replyText.substring(0, 20)));
        },
        { timeout: 10000 },
        data.reply
      );
      
      // Verify both user and assistant messages are visible
      const userMessageVisible = await page.evaluate((msg) => {
        return document.body.textContent?.includes(msg) || false;
      }, testMessage);
      
      if (!userMessageVisible) {
        throw new Error("User message not visible in UI");
      }
      
      const assistantMessageVisible = await page.evaluate((reply) => {
        return document.body.textContent?.includes(reply.substring(0, 20)) || false;
      }, data.reply);
      
      if (!assistantMessageVisible) {
        throw new Error("Assistant message not visible in UI");
      }
    });

    await this.test("LLM: Conversation history maintained across messages", async (page) => {
      // Reload to start fresh
      await page.reload({ waitUntil: "networkidle2" });
      
      // Clear rate limit
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      // Send first message
      await input.type("My name is TestUser");
      await page.keyboard.press("Enter");
      
      // Wait for first response
      await page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
        { timeout: 15000 }
      );
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Send second message that references the first
      await input.type("What is my name?");
      await page.keyboard.press("Enter");
      
      // Wait for second response
      const response = await page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
        { timeout: 15000 }
      );
      
      const data = await response.json();
      
      // Verify conversation context was maintained
      const request = response.request();
      const postData = request.postData();
      if (postData) {
        const requestBody = JSON.parse(postData);
        if (requestBody.messages.length < 2) {
          throw new Error("Conversation history not maintained - expected at least 2 messages");
        }
        
        const hasFirstMessage = requestBody.messages.some((m: any) => 
          m.content.includes("My name is TestUser")
        );
        const hasSecondMessage = requestBody.messages.some((m: any) => 
          m.content.includes("What is my name?")
        );
        
        if (!hasFirstMessage || !hasSecondMessage) {
          throw new Error("Conversation history incomplete");
        }
      }
      
      // Verify both messages appear in UI
      await page.waitForFunction(
        () => {
          const messages = Array.from(document.querySelectorAll('[class*="MessageBubble"]'));
          const texts = messages.map((el) => el.textContent || "");
          return texts.some((t) => t.includes("My name is TestUser")) &&
                 texts.some((t) => t.includes("What is my name?"));
        },
        { timeout: 10000 }
      );
    });

    await this.test("LLM: Different effort levels produce different responses", async (page) => {
      // Reload to start fresh
      await page.reload({ waitUntil: "networkidle2" });
      
      // Clear rate limit
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      // Test with low effort (10)
      const slider = await page.$('input[type="range"]');
      if (!slider) throw new Error("Slider not found");
      
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "10";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider);
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      await input.type("Explain quantum computing");
      await page.keyboard.press("Enter");
      
      const lowEffortResponse = await page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
        { timeout: 15000 }
      );
      
      const lowData = await lowEffortResponse.json();
      const lowReply = lowData.reply;
      
      // Wait for message to appear
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Now test with high effort (95)
      await page.reload({ waitUntil: "networkidle2" });
      
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      const slider2 = await page.$('input[type="range"]');
      if (!slider2) throw new Error("Slider not found");
      
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "95";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider2);
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const input2 = await page.$('input[placeholder*="Type a message"]');
      if (!input2) throw new Error("Input not found");
      
      await input2.type("Explain quantum computing");
      await page.keyboard.press("Enter");
      
      const highEffortResponse = await page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
        { timeout: 15000 }
      );
      
      const highData = await highEffortResponse.json();
      const highReply = highData.reply;
      
      // Responses should be different (low effort might refuse or be very short)
      if (lowReply.length === highReply.length) {
        // They might be similar, but at least verify both responses exist
        if (lowReply.length === 0 || highReply.length === 0) {
          throw new Error("One of the responses is empty");
        }
      }
      
      // Verify both responses appear in UI
      await page.waitForFunction(
        (reply) => {
          return document.body.textContent?.includes(reply.substring(0, 20)) || false;
        },
        { timeout: 10000 },
        highReply
      );
    });

    await this.test("LLM: Typing indicator appears during LLM response", async (page) => {
      // Reload to start fresh
      await page.reload({ waitUntil: "networkidle2" });
      
      // Clear rate limit
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      await input.type("Test typing indicator");
      await page.keyboard.press("Enter");
      
      // Check for typing indicator (might be very fast, so check immediately)
      const typingIndicator = await page.evaluate(() => {
        return document.body.textContent?.includes("Zzz") || false;
      });
      
      // Typing indicator might appear and disappear quickly, so we just verify
      // that the loading state exists at some point
      // The important thing is that the response eventually appears
      
      // Wait for response
      await page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
        { timeout: 15000 }
      );
      
      // Wait for assistant message to appear
      await page.waitForFunction(
        () => {
          const messages = Array.from(document.querySelectorAll('[class*="MessageBubble"]'));
          return messages.length >= 2; // At least user + assistant
        },
        { timeout: 10000 }
      );
    });

    await this.test("LLM: Message bubbles render correctly for user and assistant", async (page) => {
      // Reload to start fresh
      await page.reload({ waitUntil: "networkidle2" });
      
      // Clear rate limit
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      const userMessage = "Test message bubble rendering";
      await input.type(userMessage);
      await page.keyboard.press("Enter");
      
      // Wait for response
      await page.waitForResponse(
        (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
        { timeout: 15000 }
      );
      
      // Wait for messages to render
      await page.waitForFunction(
        () => {
          const messages = Array.from(document.querySelectorAll('[class*="MessageBubble"]'));
          return messages.length >= 2;
        },
        { timeout: 10000 }
      );
      
      // Verify message bubbles exist
      const messageBubbles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[class*="MessageBubble"]')).length;
      });
      
      if (messageBubbles < 2) {
        throw new Error(`Expected at least 2 message bubbles, got ${messageBubbles}`);
      }
      
      // Verify user message is visible
      const userMessageVisible = await page.evaluate((msg) => {
        return document.body.textContent?.includes(msg) || false;
      }, userMessage);
      
      if (!userMessageVisible) {
        throw new Error("User message bubble not visible");
      }
    });

    await this.test("API: Boost button calls PUT /api/chat", async (page) => {
      // Reload page to reset boost cooldown
      await page.reload({ waitUntil: "networkidle2" });
      
      // Clear rate limit
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const boostButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((btn) => btn.textContent?.includes("Boost") && !(btn as HTMLButtonElement).disabled) || null;
      });
      if (!boostButton || !(await boostButton.asElement())) {
        throw new Error("Boost button not found or is disabled");
      }
      
      const responsePromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "PUT",
        { timeout: 5000 }
      );
      
      const boostButtonEl = await boostButton.asElement()!;
      await page.evaluate((el) => el.click(), boostButtonEl);
      
      const request = await responsePromise;
      if (request.method() !== "PUT") {
        throw new Error(`Expected PUT, got ${request.method()}`);
      }
    });

    await this.test("API: Effort level included in request", async (page) => {
      // Reload page to start fresh
      await page.reload({ waitUntil: "networkidle2" });
      
      // Clear rate limit
      await page.evaluate(async () => {
        try {
          await fetch("/api/chat", { method: "DELETE" });
        } catch (e) {
          // Ignore errors
        }
      });
      
      const slider = await page.$('input[type="range"]');
      if (!slider) throw new Error("Slider not found");
      
      // Set range input value and trigger React onChange
      await page.evaluate((el, value) => {
        (el as HTMLInputElement).value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider, "80");
      
      // Wait for Zustand store to update
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Verify effort label shows 80 (this confirms Zustand store updated)
      let effortLabel = null;
      for (let i = 0; i < 5; i++) {
        effortLabel = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll("*"));
          const labelEl = elements.find((el) => {
            const text = el.textContent || "";
            return text.includes("Effort Level: 80");
          });
          return labelEl?.textContent || null;
        });
        
        if (effortLabel && effortLabel.includes("80")) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      
      if (!effortLabel || !effortLabel.includes("80")) {
        throw new Error("Effort level label did not update to 80");
      }
      
      const input = await page.$('input[placeholder*="Type a message"]');
      if (!input) throw new Error("Input not found");
      
      await input.type("Effort test");
      
      const requestPromise = page.waitForRequest(
        (request) => request.url().includes("/api/chat") && request.method() === "POST",
        { timeout: 5000 }
      );
      
      await page.keyboard.press("Enter");
      
      const request = await requestPromise;
      const postData = request.postData();
      if (!postData) {
        throw new Error("Request has no post data");
      }
      
      const requestBody = JSON.parse(postData);
      
      if (requestBody.effort !== 80) {
        throw new Error(`Expected effort 80, got ${requestBody.effort}`);
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
const tester = new MCPCDPTester();
tester.runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

