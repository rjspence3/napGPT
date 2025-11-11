/**
 * Performance tracking and console error counting
 * Captures Performance.getMetrics, Tracing, and console errors/warnings
 */

import puppeteer from "puppeteer";
import * as fs from "fs/promises";
import * as path from "path";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "performance");

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  consoleErrors: number;
  consoleWarnings: number;
  networkRequests: number;
  domContentLoaded: number;
  loadComplete: number;
}

const metrics: PerformanceMetrics[] = [];
const consoleLogs: Array<{ level: string; message: string; timestamp: number }> = [];

async function capturePerformanceMetrics(page: puppeteer.Page, name: string): Promise<PerformanceMetrics> {
  // Clear console logs
  consoleLogs.length = 0;

  // Start tracing
  const cdp = await page.target().createCDPSession();
  await cdp.send("Performance.enable");
  await cdp.send("Tracing.start", {
    categories: ["-*", "devtools.timeline", "v8", "blink.user_timing"],
    options: "sampling-frequency=10000",
  });

  const startTime = Date.now();

  // Listen to console
  page.on("console", (msg) => {
    const level = msg.type();
    const text = msg.text();
    consoleLogs.push({
      level,
      message: text,
      timestamp: Date.now(),
    });
  });

  // Perform action
  if (name === "page-load") {
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
  } else if (name === "send-message") {
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type("Performance test");
    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 15000 }).catch(() => {});
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Stop tracing
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await cdp.send("Tracing.stop");

  // Get performance metrics
  const perfMetrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
      loadComplete: perf.loadEventEnd - perf.loadEventStart,
    };
  }).catch(() => ({
    domContentLoaded: 0,
    loadComplete: 0,
  }));

  // Count console errors/warnings
  const consoleErrors = consoleLogs.filter((log) => log.level === "error").length;
  const consoleWarnings = consoleLogs.filter((log) => log.level === "warning").length;

  // Count network requests
  const networkRequests = await page.evaluate(() => {
    return performance.getEntriesByType("resource").length;
  }).catch(() => 0);

  return {
    name,
    duration,
    timestamp: startTime,
    consoleErrors,
    consoleWarnings,
    networkRequests,
    domContentLoaded: perfMetrics.domContentLoaded,
    loadComplete: perfMetrics.loadComplete,
  };
}

async function main() {
  console.log("⚡ Starting performance tests...\n");

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: process.env.HEADFUL !== "1",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test 1: Page load performance
    console.log("📊 Measuring page load performance...");
    const loadMetrics = await capturePerformanceMetrics(page, "page-load");
    metrics.push(loadMetrics);
    console.log(`  Duration: ${loadMetrics.duration}ms`);
    console.log(`  DOM Content Loaded: ${loadMetrics.domContentLoaded}ms`);
    console.log(`  Load Complete: ${loadMetrics.loadComplete}ms`);
    console.log(`  Network Requests: ${loadMetrics.networkRequests}`);
    console.log(`  Console Errors: ${loadMetrics.consoleErrors}`);
    console.log(`  Console Warnings: ${loadMetrics.consoleWarnings}`);

    // Test 2: Message send performance
    console.log("\n📊 Measuring message send performance...");
    const sendMetrics = await capturePerformanceMetrics(page, "send-message");
    metrics.push(sendMetrics);
    console.log(`  Duration: ${sendMetrics.duration}ms`);
    console.log(`  Console Errors: ${sendMetrics.consoleErrors}`);
    console.log(`  Console Warnings: ${sendMetrics.consoleWarnings}`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("⚡ PERFORMANCE TEST SUMMARY");
    console.log("=".repeat(60));

    const totalErrors = metrics.reduce((sum, m) => sum + m.consoleErrors, 0);
    const totalWarnings = metrics.reduce((sum, m) => sum + m.consoleWarnings, 0);

    console.log(`\n📊 Metrics Collected: ${metrics.length}`);
    console.log(`❌ Total Console Errors: ${totalErrors}`);
    console.log(`⚠️  Total Console Warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
      console.log("\n❌ Console Errors Found:");
      consoleLogs
        .filter((log) => log.level === "error")
        .forEach((log) => {
          console.log(`  - ${log.message}`);
        });
    }

    if (totalWarnings > 0) {
      console.log("\n⚠️  Console Warnings Found:");
      consoleLogs
        .filter((log) => log.level === "warning")
        .forEach((log) => {
          console.log(`  - ${log.message}`);
        });
    }

    // Save results
    const resultsPath = path.join(ARTIFACTS_DIR, "perf-results.json");
    await fs.writeFile(
      resultsPath,
      JSON.stringify(
        {
          metrics,
          consoleLogs,
          summary: {
            totalErrors,
            totalWarnings,
            avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
          },
        },
        null,
        2
      )
    );
    console.log(`\n📄 Results saved to: ${resultsPath}`);

    // Fail if errors found
    process.exit(totalErrors > 0 ? 1 : 0);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

