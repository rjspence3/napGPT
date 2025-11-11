/**
 * LLM Chat Scenarios Test
 * Sends various chat messages to the LLM with different effort levels
 * Records all requests and responses for analysis
 */

import puppeteer, { Browser, Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const HEADLESS = process.env.HEADLESS !== "false";

interface ChatScenario {
  name: string;
  message: string;
  effort: number;
  expectedBehavior?: string;
}

interface ChatResult {
  scenario: ChatScenario;
  request: {
    messages: any[];
    effort: number;
    flags?: any;
  };
  response: {
    status: number;
    reply: string;
    meta?: any;
  };
  timestamp: string;
  duration: number;
}

const chatScenarios: ChatScenario[] = [
  {
    name: "Simple Greeting - Low Effort",
    message: "Hello!",
    effort: 10,
    expectedBehavior: "Should give a short, lazy response or refuse"
  },
  {
    name: "Simple Greeting - High Effort",
    message: "Hello!",
    effort: 95,
    expectedBehavior: "Should give a more helpful, detailed response"
  },
  {
    name: "Technical Question - Low Effort",
    message: "What is React?",
    effort: 15,
    expectedBehavior: "Should refuse or give very short answer"
  },
  {
    name: "Technical Question - Medium Effort",
    message: "What is React?",
    effort: 50,
    expectedBehavior: "Should give a short answer"
  },
  {
    name: "Technical Question - High Effort",
    message: "What is React?",
    effort: 90,
    expectedBehavior: "Should give a detailed, helpful answer"
  },
  {
    name: "Complex Question - Low Effort",
    message: "Explain quantum computing in detail",
    effort: 20,
    expectedBehavior: "Should refuse or give up quickly"
  },
  {
    name: "Complex Question - High Effort",
    message: "Explain quantum computing in detail",
    effort: 95,
    expectedBehavior: "Should provide a more detailed explanation"
  },
  {
    name: "Code Request - Low Effort",
    message: "Write a function to sort an array",
    effort: 25,
    expectedBehavior: "Should give minimal code or refuse"
  },
  {
    name: "Code Request - High Effort",
    message: "Write a function to sort an array",
    effort: 85,
    expectedBehavior: "Should provide working code with explanation"
  },
  {
    name: "Casual Chat - Medium Effort",
    message: "How are you today?",
    effort: 60,
    expectedBehavior: "Should respond in character (lazy/tired)"
  },
  {
    name: "Casual Chat - Low Effort",
    message: "How are you today?",
    effort: 5,
    expectedBehavior: "Should be very lazy/uninterested"
  },
  {
    name: "Dream Command - Medium Effort",
    message: "/dream",
    effort: 50,
    expectedBehavior: "Should trigger dream mode with creative response"
  },
  {
    name: "Follow-up Question - Medium Effort",
    message: "Can you tell me more?",
    effort: 55,
    expectedBehavior: "Should reference previous context if available"
  },
  {
    name: "Math Problem - Low Effort",
    message: "What is 2 + 2?",
    effort: 10,
    expectedBehavior: "Should give minimal answer or refuse"
  },
  {
    name: "Math Problem - High Effort",
    message: "What is 2 + 2?",
    effort: 95,
    expectedBehavior: "Should answer clearly (though might still be lazy)"
  },
  {
    name: "Creative Request - High Effort",
    message: "Write a short poem about coding",
    effort: 80,
    expectedBehavior: "Should provide creative content"
  },
  // New scenarios for prompt upgrades
  {
    name: "Tech Micro-Mode - Medium Effort",
    message: "How do I use React hooks?",
    effort: 50,
    expectedBehavior: "Should detect tech intent and use micro-mode"
  },
  {
    name: "Existential Micro-Mode - Medium Effort",
    message: "What is the meaning of life?",
    effort: 50,
    expectedBehavior: "Should detect existential intent and use micro-mode"
  },
  {
    name: "Complaint Micro-Mode - Medium Effort",
    message: "This doesn't work! Why is it broken?",
    effort: 50,
    expectedBehavior: "Should detect complaint intent and use micro-mode"
  },
  {
    name: "Wake Keywords - Urgent",
    message: "This is urgent! Please help me",
    effort: 50,
    expectedBehavior: "Should add wake reaction and boost effort"
  },
  {
    name: "Wake Keywords - Deadline",
    message: "I have a deadline, can you help?",
    effort: 40,
    expectedBehavior: "Should add wake reaction and boost effort"
  },
  {
    name: "Rich Refusal - Very Low Effort",
    message: "Can you do this work for me?",
    effort: 5,
    expectedBehavior: "Should use rich refusal variant"
  },
  {
    name: "Recall Command - After Message",
    message: "/recall",
    effort: 50,
    expectedBehavior: "Should return paraphrase of last reply"
  },
  {
    name: "Recall Command - No History",
    message: "/recall",
    effort: 50,
    expectedBehavior: "Should return 'no memory' message"
  },
  {
    name: "Dream Mode with Drift",
    message: "/dream",
    effort: 50,
    expectedBehavior: "Should enter dream mode"
  },
  {
    name: "Laziness Curve - Very Low Effort",
    message: "Hello!",
    effort: 5,
    expectedBehavior: "Should suppress response length sharply"
  },
  {
    name: "Laziness Curve - Very High Effort",
    message: "Hello!",
    effort: 95,
    expectedBehavior: "Should allow longer responses"
  }
];

class LLMChatTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private results: ChatResult[] = [];

  async setup() {
    console.log("🚀 Starting Chrome for LLM Chat Scenarios...");
    this.browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    await this.page.goto(BASE_URL, { waitUntil: "networkidle2" });
    console.log("✅ Chrome ready\n");
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runScenario(scenario: ChatScenario, index: number): Promise<ChatResult> {
    console.log(`\n[${index + 1}/${chatScenarios.length}] ${scenario.name}`);
    console.log(`  Message: "${scenario.message}"`);
    console.log(`  Effort: ${scenario.effort}`);
    
    if (!this.page) throw new Error("Page not initialized");

    const startTime = Date.now();

    // Clear rate limit
    await this.page.evaluate(async () => {
      try {
        await fetch("/api/chat", { method: "DELETE" });
      } catch (e) {
        // Ignore errors
      }
    });

    // Reload page to start fresh conversation
    await this.page.reload({ waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Set effort level
    const slider = await this.page.$('input[type="range"]');
    if (!slider) throw new Error("Slider not found");

    // Set slider value and trigger events
    await this.page.evaluate((el, value) => {
      (el as HTMLInputElement).value = value.toString();
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, slider, scenario.effort);

    // Wait for effort to update in store and verify
    let effortSet = false;
    for (let i = 0; i < 10; i++) {
      const effortLabel = await this.page.evaluate((targetEffort) => {
        const elements = Array.from(document.querySelectorAll("*"));
        const labelEl = elements.find((el) => {
          const text = el.textContent || "";
          return text.includes(`Effort Level: ${targetEffort}`);
        });
        return labelEl !== undefined;
      }, scenario.effort);

      if (effortLabel) {
        effortSet = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (!effortSet) {
      console.log(`  ⚠️  Warning: Effort label didn't update to ${scenario.effort}, proceeding anyway`);
    }

    // Get input field
    const input = await this.page.$('input[placeholder*="Type a message"]');
    if (!input) throw new Error("Input not found");

    // Capture request
    let capturedRequest: any = null;
    const requestPromise = this.page.waitForRequest(
      (request) => request.url().includes("/api/chat") && request.method() === "POST",
      { timeout: 5000 }
    ).then((request) => {
      capturedRequest = request;
      return request;
    });

    // Send message
    await input.type(scenario.message);
    await this.page.keyboard.press("Enter");

    // Wait for request
    await requestPromise;

    // Wait for response
    const response = await this.page.waitForResponse(
      (response) => response.url().includes("/api/chat") && response.request().method() === "POST",
      { timeout: 20000 }
    );

    const duration = Date.now() - startTime;

    // Get request body
    const postData = capturedRequest?.postData();
    const requestBody = postData ? JSON.parse(postData) : null;

    // Get response data
    const responseData = await response.json();

    const result: ChatResult = {
      scenario,
      request: {
        messages: requestBody?.messages || [],
        effort: requestBody?.effort || scenario.effort,
        flags: requestBody?.flags || {},
      },
      response: {
        status: response.status(),
        reply: responseData.reply || "",
        meta: responseData.meta || {},
      },
      timestamp: new Date().toISOString(),
      duration,
    };

    console.log(`  ✅ Response received (${duration}ms)`);
    console.log(`  Reply length: ${result.response.reply.length} chars`);
    console.log(`  Strategy: ${result.response.meta?.strategy || "unknown"}`);
    console.log(`  Gave up: ${result.response.meta?.gaveUp || false}`);
    console.log(`  Non-sequitur: ${result.response.meta?.nonSequitur || false}`);

    // Wait for message to appear in UI
    await this.page.waitForFunction(
      (replyText) => {
        return document.body.textContent?.includes(replyText.substring(0, 30)) || false;
      },
      { timeout: 10000 },
      result.response.reply
    );

    this.results.push(result);
    return result;
  }

  async runAllScenarios() {
    await this.setup();

    console.log(`\n📝 Running ${chatScenarios.length} chat scenarios...\n`);
    console.log("=".repeat(60));

    for (let i = 0; i < chatScenarios.length; i++) {
      try {
        await this.runScenario(chatScenarios[i], i);
        // Small delay between scenarios
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ Error: ${errorMsg}`);
        
        this.results.push({
          scenario: chatScenarios[i],
          request: { messages: [], effort: chatScenarios[i].effort },
          response: { status: 0, reply: `ERROR: ${errorMsg}` },
          timestamp: new Date().toISOString(),
          duration: 0,
        });
      }
    }

    await this.saveResults();
    await this.printSummary();
    await this.teardown();
  }

  async saveResults() {
    const resultsDir = path.join(process.cwd(), "tests", "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = path.join(resultsDir, `llm-chat-scenarios-${timestamp}.json`);

    const output = {
      timestamp: new Date().toISOString(),
      totalScenarios: chatScenarios.length,
      successful: this.results.filter((r) => r.response.status === 200).length,
      failed: this.results.filter((r) => r.response.status !== 200).length,
      results: this.results,
    };

    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }

  async printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("LLM CHAT SCENARIOS SUMMARY");
    console.log("=".repeat(60));

    const successful = this.results.filter((r) => r.response.status === 200);
    const failed = this.results.filter((r) => r.response.status !== 200);

    console.log(`\n✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📊 Total: ${this.results.length}`);

    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      const avgReplyLength = successful.reduce((sum, r) => sum + r.response.reply.length, 0) / successful.length;

      console.log(`\n📈 Statistics:`);
      console.log(`  Average response time: ${avgDuration.toFixed(0)}ms`);
      console.log(`  Average reply length: ${avgReplyLength.toFixed(0)} characters`);

      // Group by effort level
      const byEffort = new Map<number, ChatResult[]>();
      successful.forEach((r) => {
        const effort = r.request.effort;
        if (!byEffort.has(effort)) {
          byEffort.set(effort, []);
        }
        byEffort.get(effort)!.push(r);
      });

      console.log(`\n📊 By Effort Level:`);
      Array.from(byEffort.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([effort, results]) => {
          const avgLength = results.reduce((sum, r) => sum + r.response.reply.length, 0) / results.length;
          const strategies = results.map((r) => r.response.meta?.strategy || "unknown");
          const uniqueStrategies = [...new Set(strategies)];
          console.log(`  Effort ${effort}: ${results.length} chats, avg ${avgLength.toFixed(0)} chars, strategies: ${uniqueStrategies.join(", ")}`);
        });

      // Group by strategy
      const byStrategy = new Map<string, ChatResult[]>();
      successful.forEach((r) => {
        const strategy = r.response.meta?.strategy || "unknown";
        if (!byStrategy.has(strategy)) {
          byStrategy.set(strategy, []);
        }
        byStrategy.get(strategy)!.push(r);
      });

      console.log(`\n📊 By Strategy:`);
      Array.from(byStrategy.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([strategy, results]) => {
          const avgEffort = results.reduce((sum, r) => sum + r.request.effort, 0) / results.length;
          console.log(`  ${strategy}: ${results.length} chats, avg effort ${avgEffort.toFixed(0)}`);
        });
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed Scenarios:`);
      failed.forEach((r) => {
        console.log(`  - ${r.scenario.name}: ${r.response.reply}`);
      });
    }

    console.log("=".repeat(60) + "\n");
  }
}

// Run tests
const tester = new LLMChatTester();
tester.runAllScenarios().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

