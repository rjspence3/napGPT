/**
 * MCP Scenarios Runner
 * Runs all MCP/Puppeteer scenarios and collects results
 */

import { createMCPClient } from '../mcp/utils/mcpClient';
import type { TestEnv } from './env';
import type { TestResult } from './utils';
import * as path from 'path';

// Import all scenarios
import { runSmokeTest } from '../mcp/scenarios/00_smoke';
import { runEffortBandsTest } from '../mcp/scenarios/10_effort_bands';
import { runBoostAndCooldownTest } from '../mcp/scenarios/20_boost_and_cooldown';
import { runIdleAndOverlayTest } from '../mcp/scenarios/30_idle_and_overlay';
import { runEnergyMeterTest } from '../mcp/scenarios/40_energy_meter';
import { runCommandsDreamNapTest } from '../mcp/scenarios/50_commands_dream_nap';
import { runBlanketModeTest } from '../mcp/scenarios/25_blanket_mode';
import { runCoffeeEconomyTest } from '../mcp/scenarios/35_coffee_economy';
import { runDreamDriftTest } from '../mcp/scenarios/55_dream_drift';
import { runContextThreadingTest } from '../mcp/scenarios/60_context_threading';
import { runErrorAndRetryTest } from '../mcp/scenarios/70_error_and_retry';
import { runMathAndCodeGuardsTest } from '../mcp/scenarios/80_math_and_code_guards';
import { runNonSequiturDropoutBoundsTest } from '../mcp/scenarios/90_non_sequitur_dropout_bounds';
import { runApiEndpointsTest } from '../mcp/scenarios/95_api_endpoints';
import { runWakeReactionsTest } from '../mcp/scenarios/96_wake_reactions';
import { runEchoFragmentsTest } from '../mcp/scenarios/97_echo_fragments';
import { runSelfReferencesTest } from '../mcp/scenarios/98_self_references';
import { runRecallCommandTest } from '../mcp/scenarios/99_recall_command';
import { runUiInteractionsTest } from '../mcp/scenarios/100_ui_interactions';
import { runEdgeCasesTest } from '../mcp/scenarios/101_edge_cases';
import { runNetworkErrorsTest } from '../mcp/scenarios/102_network_errors';

const SCENARIOS = [
  { name: '00_smoke', fn: runSmokeTest, description: 'Smoke test: Basic page load and message sending' },
  { name: '10_effort_bands', fn: runEffortBandsTest, description: 'Effort bands: Strategy behavior at different effort levels' },
  { name: '20_boost_and_cooldown', fn: runBoostAndCooldownTest, description: 'Boost button and cooldown mechanism' },
  { name: '25_blanket_mode', fn: runBlanketModeTest, description: 'Blanket Mode: Visual overlay based on effort and idle state' },
  { name: '30_idle_and_overlay', fn: runIdleAndOverlayTest, description: 'Idle overlay and nap timer' },
  { name: '35_coffee_economy', fn: runCoffeeEconomyTest, description: 'Coffee Economy: Bean currency for Boost button' },
  { name: '40_energy_meter', fn: runEnergyMeterTest, description: 'Energy meter draining and refilling' },
  { name: '50_commands_dream_nap', fn: runCommandsDreamNapTest, description: '/dream and /nap commands' },
  { name: '55_dream_drift', fn: runDreamDriftTest, description: 'Dream Drift: Whimsical fragments appended to replies' },
  { name: '60_context_threading', fn: runContextThreadingTest, description: 'Conversation context threading' },
  { name: '70_error_and_retry', fn: runErrorAndRetryTest, description: 'Error handling and retry logic' },
  { name: '80_math_and_code_guards', fn: runMathAndCodeGuardsTest, description: 'Math and code intent guards' },
  { name: '90_non_sequitur_dropout_bounds', fn: runNonSequiturDropoutBoundsTest, description: 'Dropout and non-sequitur bounds' },
  { name: '95_api_endpoints', fn: runApiEndpointsTest, description: 'API endpoints: PUT, DELETE, GET /api/mode' },
  { name: '96_wake_reactions', fn: runWakeReactionsTest, description: 'Wake reactions and keyword detection' },
  { name: '97_echo_fragments', fn: runEchoFragmentsTest, description: 'Echo fragments (prior-turn references)' },
  { name: '98_self_references', fn: runSelfReferencesTest, description: 'Self-reference fragments' },
  { name: '99_recall_command', fn: runRecallCommandTest, description: '/recall command functionality' },
  { name: '100_ui_interactions', fn: runUiInteractionsTest, description: 'UI interactions: keyboard, focus, scroll, alignment' },
  { name: '101_edge_cases', fn: runEdgeCasesTest, description: 'Edge cases: boundaries, empty inputs, long messages' },
  { name: '102_network_errors', fn: runNetworkErrorsTest, description: 'Network error scenarios: rate limits, timeouts, 500s' },
];

/**
 * Run all MCP scenarios
 */
export async function runMCPScenarios(env: TestEnv, artifactsDir: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let client = null;

  try {
    // Create MCP client
    client = await createMCPClient(env.baseUrl, !env.headful);

    // Run each scenario
    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];
      const start = Date.now();
      const startTime = start; // Alias for logging

      // Reset app state between scenarios
      // Avoid navigation/reload to prevent frame detachment
      try {
        // Clear localStorage and sessionStorage without navigating
        await client.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        // Wait for app to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (resetError) {
        // If reset fails, only navigate as last resort (will cause frame detachment)
        // But this should rarely happen
        try {
          await client.goto(env.baseUrl);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (navError) {
          // Ignore navigation errors, continue with test
        }
      }

      try {
        const result = await scenario.fn(client);
        const duration = Date.now() - start;

        // Capture failure screenshot
      if (!result.passed) {
        console.log(`     [${Date.now() - startTime}ms] Test failed, capturing screenshot...`);
        try {
          const failureDir = path.join(artifactsDir, 'failures');
          await require('fs/promises').mkdir(failureDir, { recursive: true });
          const screenshotPath = path.join(failureDir, `${scenario.name}.png`);
          if (client.page) {
            await client.page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`     [${Date.now() - startTime}ms] Screenshot saved: ${screenshotPath}`);
          }
        } catch (screenshotError) {
          console.log(`     [${Date.now() - startTime}ms] Failed to capture screenshot: ${screenshotError}`);
        }
      }
      
      // Log notes with timestamps
      if (result.notes && result.notes.length > 0) {
        console.log(`     Notes:`);
        result.notes.forEach((note, idx) => {
          const elapsed = idx === 0 ? Date.now() - startTime : '...';
          console.log(`       [${elapsed}ms] ${note}`);
        });
      }

        results.push({
          name: scenario.name,
          passed: result.passed,
          duration,
          error: result.passed ? undefined : result.notes?.join('; '),
        });

        if (result.passed) {
          console.log(`  ✅ ${scenario.name} (${duration}ms)`);
        } else {
          console.log(`  ❌ ${scenario.name} (${duration}ms)`);
          if (result.notes && result.notes.length > 0) {
            result.notes.forEach((note: string) => console.log(`     ${note}`));
          }
        }
      } catch (error: any) {
        const duration = Date.now() - start;
        const errorMsg = error.message || String(error);
        const errorStack = error.stack || '';
        results.push({
          name: scenario.name,
          passed: false,
          duration,
          error: errorMsg,
        });
        console.log(`  ❌ ${scenario.name} ERROR: ${errorMsg}`);
        if (errorStack) {
          console.log(`     Stack: ${errorStack.split('\n').slice(0, 3).join('\n     ')}`);
        }
      }
    }
  } finally {
    // MCP client cleanup (if needed)
    if (client && typeof (client as any).close === 'function') {
      await (client as any).close();
    } else if (client && (client as any).browser) {
      await (client as any).browser.close();
    }
  }

  return results;
}

