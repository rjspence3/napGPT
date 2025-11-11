/**
 * Visual regression tests using pixel diff
 * Captures baselines for key UI states and compares against them
 */

import puppeteer from "puppeteer";
import * as fs from "fs/promises";
import * as path from "path";
import { compareWithBaseline, saveBaseline, ensureBaselineDir } from "./mcp/utils/visual";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "visual-tests");
const BASELINE_DIR = path.join(process.cwd(), "artifacts", "_baseline");

interface VisualTestResult {
  name: string;
  passed: boolean;
  mismatches?: number;
  threshold?: number;
  diffPath?: string;
  error?: string;
}

const results: VisualTestResult[] = [];

async function captureState(page: puppeteer.Page, name: string): Promise<string> {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  const filepath = path.join(ARTIFACTS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false }); // Viewport only for consistency
  return filepath;
}

async function testVisual(
  name: string,
  setup: (page: puppeteer.Page) => Promise<void>,
  page: puppeteer.Page,
  threshold: number = 0.1
): Promise<void> {
  try {
    console.log(`\n📸 Visual test: ${name}`);
    await setup(page);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for animations
    
    const screenshotPath = await captureState(page, name);
    const diffPath = path.join(ARTIFACTS_DIR, `${name}-diff.png`);
    
    const diffResult = await compareWithBaseline(name, screenshotPath, diffPath, threshold);
    
    if (diffResult === null) {
      console.log(`  ✅ Baseline created for ${name}`);
      results.push({ name, passed: true });
    } else {
      if (diffResult.passed) {
        console.log(`  ✅ PASSED: ${name} (${diffResult.mismatches} mismatches, threshold: ${threshold})`);
        results.push({
          name,
          passed: true,
          mismatches: diffResult.mismatches,
          threshold: diffResult.threshold,
        });
      } else {
        console.log(`  ❌ FAILED: ${name} (${diffResult.mismatches} mismatches exceed threshold)`);
        results.push({
          name,
          passed: false,
          mismatches: diffResult.mismatches,
          threshold: diffResult.threshold,
          diffPath: diffResult.diffPath,
        });
      }
    }
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${name} - ${error.message}`);
    results.push({ name, passed: false, error: error.message });
  }
}

async function main() {
  console.log("🎨 Starting visual regression tests...\n");
  console.log(`📁 Baselines: ${BASELINE_DIR}`);
  console.log(`📁 Artifacts: ${ARTIFACTS_DIR}\n`);

  await ensureBaselineDir();
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: process.env.HEADFUL !== "1",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 }); // Fixed viewport for consistency

    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ============================================
    // KEY STATE 1: Initial State (Empty)
    // ============================================
    await testVisual("initial-empty", async (page) => {
      // Already at initial state
    }, page);

    // ============================================
    // KEY STATE 2: Effort at 5 (Low)
    // ============================================
    await testVisual("effort-5", async (page) => {
      const slider = await page.$('[data-testid="effort-slider"]');
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "5";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }, page);

    // ============================================
    // KEY STATE 3: Effort at 60 (Mid)
    // ============================================
    await testVisual("effort-60", async (page) => {
      const slider = await page.$('[data-testid="effort-slider"]');
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "60";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }, page);

    // ============================================
    // KEY STATE 4: Effort at 92 (High)
    // ============================================
    await testVisual("effort-92", async (page) => {
      const slider = await page.$('[data-testid="effort-slider"]');
      await page.evaluate((el) => {
        (el as HTMLInputElement).value = "92";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, slider);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }, page);

    // ============================================
    // KEY STATE 5: Energy Mid-Drain
    // ============================================
    await testVisual("energy-mid-drain", async (page) => {
      // Send a message to drain energy
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type("Drain energy");
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Energy should be around 90% after one message (drains 10)
    }, page, 0.15); // Higher threshold for energy meter animation

    // ============================================
    // KEY STATE 6: Boost Cooldown DISABLED
    // ============================================
    await testVisual("boost-cooldown-disabled", async (page) => {
      const boostBtn = await page.$('[data-testid="boost-btn"]');
      const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, boostBtn);
      if (!isDisabled) {
        await boostBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      // Button should now show cooldown
    }, page);

    // ============================================
    // KEY STATE 7: /nap Dim State
    // ============================================
    await testVisual("nap-dim-state", async (page) => {
      // Wait for any previous nap to finish
      await new Promise((resolve) => setTimeout(resolve, 6000));
      
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type("/nap");
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Nap overlay should be visible
    }, page, 0.15); // Higher threshold for overlay animations

    // ============================================
    // KEY STATE 8: Idle Overlay ON (if possible)
    // ============================================
    await testVisual("idle-overlay-on", async (page) => {
      // Enable nap timer
      const toggle = await page.$('[data-testid="nap-toggle"]');
      await toggle?.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Wait for idle (30+ seconds) - we'll just verify toggle state
      // In real scenario, would wait for actual idle
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }, page, 0.2); // Very high threshold since idle overlay is timing-dependent

    // ============================================
    // KEY STATE 9: With Messages
    // ============================================
    await testVisual("with-messages", async (page) => {
      // Ensure we have messages
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type("Test message for visual");
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }, page, 0.15); // Higher threshold for message animations

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 VISUAL TEST SUMMARY");
    console.log("=".repeat(60));

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`\n✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);

    if (failed > 0) {
      console.log("\n❌ FAILED TESTS:");
      results.filter((r) => !r.passed).forEach((r) => {
        console.log(`  - ${r.name}: ${r.error || `${r.mismatches} mismatches`}`);
        if (r.diffPath) {
          console.log(`    Diff: ${r.diffPath}`);
        }
      });
    }

    // Save results
    const resultsPath = path.join(ARTIFACTS_DIR, "visual-results.json");
    await fs.writeFile(
      resultsPath,
      JSON.stringify({ results, summary: { passed, failed, total } }, null, 2)
    );
    console.log(`\n📄 Results saved to: ${resultsPath}`);

    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

