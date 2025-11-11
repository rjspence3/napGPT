#!/usr/bin/env node

/**
 * MCP Test Orchestrator
 * Runs all test scenarios using Chrome DevTools Protocol via Puppeteer
 */

const { createMCPClient } = require("./utils/mcpClient");
const config = require("./config");
const fs = require("fs/promises");
const path = require("path");

// Import all scenarios
const runSmokeTest = require("./scenarios/00_smoke").runSmokeTest;
const runEffortBandsTest = require("./scenarios/10_effort_bands").runEffortBandsTest;
const runBoostAndCooldownTest = require("./scenarios/20_boost_and_cooldown").runBoostAndCooldownTest;
const runIdleAndOverlayTest = require("./scenarios/30_idle_and_overlay").runIdleAndOverlayTest;
const runEnergyMeterTest = require("./scenarios/40_energy_meter").runEnergyMeterTest;
const runCommandsDreamNapTest = require("./scenarios/50_commands_dream_nap").runCommandsDreamNapTest;
const runContextThreadingTest = require("./scenarios/60_context_threading").runContextThreadingTest;
const runErrorAndRetryTest = require("./scenarios/70_error_and_retry").runErrorAndRetryTest;
const runMathAndCodeGuardsTest = require("./scenarios/80_math_and_code_guards").runMathAndCodeGuardsTest;
const runNonSequiturDropoutBoundsTest = require("./scenarios/90_non_sequitur_dropout_bounds").runNonSequiturDropoutBoundsTest;

const SCENARIOS = [
  { name: "00_smoke", fn: runSmokeTest, description: "Smoke test: Basic page load and message sending" },
  { name: "10_effort_bands", fn: runEffortBandsTest, description: "Effort bands: Strategy behavior at different effort levels" },
  { name: "20_boost_and_cooldown", fn: runBoostAndCooldownTest, description: "Boost button and cooldown mechanism" },
  { name: "30_idle_and_overlay", fn: runIdleAndOverlayTest, description: "Idle overlay and nap timer" },
  { name: "40_energy_meter", fn: runEnergyMeterTest, description: "Energy meter draining and refilling" },
  { name: "50_commands_dream_nap", fn: runCommandsDreamNapTest, description: "/dream and /nap commands" },
  { name: "60_context_threading", fn: runContextThreadingTest, description: "Conversation context threading" },
  { name: "70_error_and_retry", fn: runErrorAndRetryTest, description: "Error handling and retry logic" },
  { name: "80_math_and_code_guards", fn: runMathAndCodeGuardsTest, description: "Math and code intent guards" },
  { name: "90_non_sequitur_dropout_bounds", fn: runNonSequiturDropoutBoundsTest, description: "Dropout and non-sequitur bounds" },
];

async function main() {
  const headless = config.chrome.headless;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsDir = path.join(config.artifactsDir, timestamp);

  console.log("🚀 Starting NapGPT MCP Test Suite...");
  console.log(`📁 Results directory: ${resultsDir}`);
  console.log(`🌐 Base URL: ${config.baseUrl}`);
  console.log(`👁️  Headless: ${headless}\n`);

  // Ensure results directory exists
  await fs.mkdir(resultsDir, { recursive: true });

  let client = null;
  const results = [];

  try {
    // Create MCP client (Puppeteer with CDP)
    console.log("🔌 Connecting to Chrome...");
    client = await createMCPClient(config.baseUrl, headless);
    console.log("✅ Chrome ready\n");

    // Run each scenario
    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];
      console.log(`\n${"=".repeat(60)}`);
      console.log(`[${i + 1}/${SCENARIOS.length}] ${scenario.name}: ${scenario.description}`);
      console.log("=".repeat(60));

      try {
        const result = await scenario.fn(client);
        result.scenario = scenario.name;
        result.description = scenario.description;
        results.push(result);

        if (result.passed) {
          console.log(`✅ PASSED (${result.duration}ms)`);
        } else {
          console.log(`❌ FAILED (${result.duration}ms)`);
        }

        if (result.notes && result.notes.length > 0) {
          result.notes.forEach((note) => console.log(`  ${note}`));
        }
      } catch (error) {
        console.error(`❌ ERROR: ${error.message}`);
        results.push({
          scenario: scenario.name,
          description: scenario.description,
          passed: false,
          duration: 0,
          notes: [`Error: ${error.message}`, error.stack],
        });
      }
    }
  } catch (error) {
    console.error(`\n💥 Fatal error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Chrome closed");
    }
  }

  // Save results
  const resultsFile = path.join(resultsDir, "results.json");
  await fs.writeFile(resultsFile, JSON.stringify({ timestamp, results }, null, 2));

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Total duration: ${totalDuration}ms`);
  console.log(`📁 Results saved to: ${resultsFile}`);

  if (failed > 0) {
    console.log(`\n❌ Failed scenarios:`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - ${r.scenario}: ${r.notes?.[0] || "Unknown error"}`));
    process.exitCode = 1;
  } else {
    console.log(`\n🎉 All tests passed!`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { main, SCENARIOS };


