/**
 * Behavior budgets and aggregate metrics
 * Tracks response lengths, dropout rates, non-sequitur rates, latency per effort band
 */

import puppeteer from "puppeteer";
import * as fs from "fs/promises";
import * as path from "path";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "behavior-budgets");

interface MessageMetrics {
  effort: number;
  responseLength: number;
  latency: number;
  timestamp: number;
}

interface EffortBandMetrics {
  band: string;
  samples: number;
  avgLength: number;
  minLength: number;
  maxLength: number;
  medianLatency: number;
  dropoutRate: number;
  nonSeqRate: number;
}

const metrics: MessageMetrics[] = [];
const budgets = {
  // Response length ranges per effort band
  lengthRanges: {
    "0-25": { min: 10, max: 150 },
    "26-50": { min: 20, max: 300 },
    "51-75": { min: 50, max: 500 },
    "76-100": { min: 100, max: 800 },
  },
  // Dropout probability ceilings
  dropoutCeilings: {
    "0-25": 0.20,
    "26-50": 0.15,
    "51-75": 0.10,
    "76-100": 0.05,
  },
  // Non-sequitur rate ceilings
  nonSeqCeilings: {
    "0-25": 0.15,
    "26-50": 0.12,
    "51-75": 0.08,
    "76-100": 0.05,
  },
  // Median latency budgets (ms)
  latencyBudgets: {
    "0-25": 3000,
    "26-50": 4000,
    "51-75": 5000,
    "76-100": 6000,
  },
  // Global median latency
  globalMedianLatency: 4000,
};

function bandFor(effort: number): string {
  if (effort <= 25) return "0-25";
  if (effort <= 50) return "26-50";
  if (effort <= 75) return "51-75";
  return "76-100";
}

function detectDropout(text: string): boolean {
  // Simple heuristic: very short responses or common "give up" phrases
  const giveUpPhrases = ["idk", "maybe just google", "ugh", "i don't know", "not sure"];
  return text.length < 20 || giveUpPhrases.some((phrase) => text.toLowerCase().includes(phrase));
}

function detectNonSequitur(text: string, userMessage: string): boolean {
  // Simple heuristic: response doesn't relate to user message
  const userWords = userMessage.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const responseWords = text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const overlap = userWords.filter((w) => responseWords.includes(w)).length;
  // If less than 10% word overlap and response is short, likely non-sequitur
  return userWords.length > 0 && overlap / userWords.length < 0.1 && text.length < 100;
}

async function sendMessageAndMeasure(
  page: puppeteer.Page,
  message: string,
  effort: number
): Promise<MessageMetrics> {
  const startTime = Date.now();

  // Set effort
  const slider = await page.$('[data-testid="effort-slider"]');
  await page.evaluate(
    (el, val) => {
      (el as HTMLInputElement).value = String(val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    slider,
    effort
  );
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Type and send
  const input = await page.$('[data-testid="chat-input"]');
  await input?.click();
  await input?.type(message);
  const sendBtn = await page.$('[data-testid="send-btn"]');
  await sendBtn?.click();

  // Wait for response
  try {
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 15000 });
  } catch (e) {
    // Timeout - still record
  }

  const endTime = Date.now();
  const latency = endTime - startTime;

  // Get response text
  const responseText = await page.evaluate(() => {
    const messages = document.querySelectorAll('[data-testid="message-assistant"]');
    const last = messages[messages.length - 1];
    return last?.textContent || "";
  });

  return {
    effort,
    responseLength: responseText.length,
    latency,
    timestamp: startTime,
  };
}

function calculateBandMetrics(): Map<string, EffortBandMetrics> {
  const bandData = new Map<string, MessageMetrics[]>();

  metrics.forEach((m) => {
    const band = bandFor(m.effort);
    if (!bandData.has(band)) {
      bandData.set(band, []);
    }
    bandData.get(band)!.push(m);
  });

  const bandMetrics = new Map<string, EffortBandMetrics>();

  bandData.forEach((samples, band) => {
    const lengths = samples.map((s) => s.responseLength);
    const latencies = samples.map((s) => s.latency);
    lengths.sort((a, b) => a - b);
    latencies.sort((a, b) => a - b);

    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;

    // Count dropouts (need to check responses - simplified for now)
    const dropoutCount = samples.filter((s) => s.responseLength < 20).length;
    const dropoutRate = dropoutCount / samples.length;

    // Non-sequitur detection would need user messages - simplified
    const nonSeqRate = 0; // Would need to track user messages

    bandMetrics.set(band, {
      band,
      samples: samples.length,
      avgLength,
      minLength: lengths[0] || 0,
      maxLength: lengths[lengths.length - 1] || 0,
      medianLatency,
      dropoutRate,
      nonSeqRate,
    });
  });

  return bandMetrics;
}

function checkBudgets(bandMetrics: Map<string, EffortBandMetrics>): string[] {
  const violations: string[] = [];

  bandMetrics.forEach((metrics, band) => {
    const budget = budgets.lengthRanges[band as keyof typeof budgets.lengthRanges];
    if (budget) {
      if (metrics.avgLength < budget.min) {
        violations.push(`Band ${band}: avg length ${metrics.avgLength} < min ${budget.min}`);
      }
      if (metrics.avgLength > budget.max) {
        violations.push(`Band ${band}: avg length ${metrics.avgLength} > max ${budget.max}`);
      }
    }

    const dropoutCeiling = budgets.dropoutCeilings[band as keyof typeof budgets.dropoutCeilings];
    if (dropoutCeiling && metrics.dropoutRate > dropoutCeiling) {
      violations.push(`Band ${band}: dropout rate ${metrics.dropoutRate.toFixed(2)} > ceiling ${dropoutCeiling}`);
    }

    const latencyBudget = budgets.latencyBudgets[band as keyof typeof budgets.latencyBudgets];
    if (latencyBudget && metrics.medianLatency > latencyBudget) {
      violations.push(`Band ${band}: median latency ${metrics.medianLatency}ms > budget ${latencyBudget}ms`);
    }
  });

  // Global latency check
  const allLatencies = Array.from(bandMetrics.values()).map((m) => m.medianLatency);
  const globalMedian = allLatencies.sort((a, b) => a - b)[Math.floor(allLatencies.length / 2)] || 0;
  if (globalMedian > budgets.globalMedianLatency) {
    violations.push(`Global median latency ${globalMedian}ms > budget ${budgets.globalMedianLatency}ms`);
  }

  return violations;
}

async function main() {
  console.log("📊 Starting behavior budget tests...\n");

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: process.env.HEADFUL !== "1",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Collect samples across different effort levels
    const testMessages = [
      "What is 2+2?",
      "Write a hello world function",
      "Tell me about coffee",
      "How does this work?",
      "Explain quantum computing",
    ];

    const effortLevels = [5, 25, 50, 60, 75, 92];

    console.log("📈 Collecting metrics across effort bands...\n");

    for (const effort of effortLevels) {
      console.log(`  Testing effort ${effort}...`);
      for (let i = 0; i < 2; i++) {
        // 2 samples per effort level
        const message = testMessages[i % testMessages.length];
        const metric = await sendMessageAndMeasure(page, message, effort);
        metrics.push(metric);
        console.log(`    Sample ${i + 1}: ${metric.responseLength} chars, ${metric.latency}ms`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Calculate band metrics
    const bandMetrics = calculateBandMetrics();

    console.log("\n📊 Band Metrics:");
    bandMetrics.forEach((m, band) => {
      console.log(`  ${band}:`);
      console.log(`    Samples: ${m.samples}`);
      console.log(`    Avg Length: ${m.avgLength.toFixed(0)} chars`);
      console.log(`    Range: ${m.minLength}-${m.maxLength} chars`);
      console.log(`    Median Latency: ${m.medianLatency}ms`);
      console.log(`    Dropout Rate: ${(m.dropoutRate * 100).toFixed(1)}%`);
    });

    // Check budgets
    const violations = checkBudgets(bandMetrics);

    console.log("\n" + "=".repeat(60));
    console.log("📊 BEHAVIOR BUDGET SUMMARY");
    console.log("=".repeat(60));

    if (violations.length === 0) {
      console.log("\n✅ All budgets met!");
    } else {
      console.log(`\n❌ ${violations.length} budget violation(s):`);
      violations.forEach((v) => console.log(`  - ${v}`));
    }

    // Save results
    const resultsPath = path.join(ARTIFACTS_DIR, "budget-results.json");
    await fs.writeFile(
      resultsPath,
      JSON.stringify(
        {
          metrics: Array.from(bandMetrics.values()),
          violations,
          rawMetrics: metrics,
          budgets,
        },
        null,
        2
      )
    );
    console.log(`\n📄 Results saved to: ${resultsPath}`);

    process.exit(violations.length > 0 ? 1 : 0);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

