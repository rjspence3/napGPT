/**
 * Accessibility tests using axe-core and Lighthouse
 */

import puppeteer from "puppeteer";
import * as fs from "fs/promises";
import * as path from "path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "accessibility");

interface A11yResult {
  name: string;
  passed: boolean;
  violations: Array<{ id: string; impact: string; description: string }>;
  error?: string;
}

interface LighthouseResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  passed: boolean;
}

const a11yResults: A11yResult[] = [];
let lighthouseResult: LighthouseResult | null = null;

async function injectAxe(page: puppeteer.Page): Promise<void> {
  await page.addScriptTag({
    url: "https://unpkg.com/axe-core@4.9.1/axe.min.js",
  });
  // Wait for axe to load
  await page.waitForFunction(() => (window as any).axe !== undefined, { timeout: 5000 });
}

async function runAxe(page: puppeteer.Page): Promise<any> {
  return page.evaluate(() => {
    return (window as any).axe.run().then((results: any) => results);
  });
}

async function testAccessibility(name: string, page: puppeteer.Page): Promise<void> {
  try {
    console.log(`\n♿ Testing accessibility: ${name}`);
    
    await injectAxe(page);
    const results = await runAxe(page);
    
    const critical = results.violations.filter((v: any) => v.impact === "critical");
    const serious = results.violations.filter((v: any) => v.impact === "serious");
    const moderate = results.violations.filter((v: any) => v.impact === "moderate");
    const minor = results.violations.filter((v: any) => v.impact === "minor");
    
    const criticalSerious = [...critical, ...serious];
    const passed = criticalSerious.length === 0;
    
    if (passed) {
      console.log(`  ✅ PASSED: No Critical/Serious violations`);
      console.log(`     Moderate: ${moderate.length}, Minor: ${minor.length}`);
    } else {
      console.log(`  ❌ FAILED: ${criticalSerious.length} Critical/Serious violations`);
      criticalSerious.forEach((v: any) => {
        console.log(`     - ${v.id}: ${v.description}`);
      });
    }
    
    a11yResults.push({
      name,
      passed,
      violations: criticalSerious.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
      })),
    });
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
    a11yResults.push({ name, passed: false, error: error.message });
  }
}

async function runLighthouse(url: string): Promise<LighthouseResult> {
  console.log("\n🔍 Running Lighthouse audit...");
  
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  
  try {
    const options = {
      logLevel: "info" as const,
      output: "json" as const,
      onlyCategories: ["accessibility", "performance", "best-practices", "seo"],
      port: chrome.port,
    };
    
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult?.lhr;
    
    if (!lhr) {
      throw new Error("Lighthouse results not available");
    }
    
    const scores = {
      performance: Math.round((lhr.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories["best-practices"]?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100),
    };
    
    // Pass if accessibility score >= 90
    const passed = scores.accessibility >= 90;
    
    console.log(`  Performance: ${scores.performance}/100`);
    console.log(`  Accessibility: ${scores.accessibility}/100 ${passed ? "✅" : "❌"}`);
    console.log(`  Best Practices: ${scores.bestPractices}/100`);
    console.log(`  SEO: ${scores.seo}/100`);
    
    return {
      ...scores,
      passed,
    };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  console.log("♿ Starting accessibility tests...\n");

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: process.env.HEADFUL !== "1",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test initial page
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await testAccessibility("initial-page", page);

    // Test with messages
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type("Test accessibility");
    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await testAccessibility("with-messages", page);

    // Run Lighthouse
    lighthouseResult = await runLighthouse(BASE_URL);

    // Save Lighthouse JSON
    const lighthousePath = path.join(ARTIFACTS_DIR, "lighthouse.json");
    // We'll save a simplified version since we don't have the full LHR object
    await fs.writeFile(
      lighthousePath,
      JSON.stringify(lighthouseResult, null, 2)
    );

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 ACCESSIBILITY TEST SUMMARY");
    console.log("=".repeat(60));

    const a11yPassed = a11yResults.filter((r) => r.passed).length;
    const a11yFailed = a11yResults.filter((r) => !r.passed).length;

    console.log(`\n♿ Axe-core Tests:`);
    console.log(`  ✅ Passed: ${a11yPassed}/${a11yResults.length}`);
    console.log(`  ❌ Failed: ${a11yFailed}/${a11yResults.length}`);

    if (lighthouseResult) {
      console.log(`\n🔍 Lighthouse:`);
      console.log(`  Accessibility: ${lighthouseResult.accessibility}/100 ${lighthouseResult.passed ? "✅" : "❌"}`);
    }

    if (a11yFailed > 0) {
      console.log("\n❌ FAILED TESTS:");
      a11yResults.filter((r) => !r.passed).forEach((r) => {
        console.log(`  - ${r.name}: ${r.violations.length} violations`);
        r.violations.forEach((v) => {
          console.log(`    • ${v.id} (${v.impact}): ${v.description}`);
        });
      });
    }

    // Save results
    const resultsPath = path.join(ARTIFACTS_DIR, "a11y-results.json");
    await fs.writeFile(
      resultsPath,
      JSON.stringify(
        {
          axe: a11yResults,
          lighthouse: lighthouseResult,
          summary: {
            axePassed: a11yPassed,
            axeFailed: a11yFailed,
            lighthousePassed: lighthouseResult?.passed || false,
          },
        },
        null,
        2
      )
    );
    console.log(`\n📄 Results saved to: ${resultsPath}`);

    const overallPassed = a11yFailed === 0 && (lighthouseResult?.passed || false);
    process.exit(overallPassed ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

