/**
 * Flake Guard - Reruns the 6 fixed scenarios twice to detect non-determinism
 * 
 * Usage: Run in CI to ensure test stability
 * Fails if any scenario fails on retry
 */

import { createMCPClient } from '../mcp/utils/mcpClient';
import type { TestEnv } from './env';
import { loadEnv } from './env';
import { runEffortBandsTest } from '../mcp/scenarios/10_effort_bands';
import { runBoostAndCooldownTest } from '../mcp/scenarios/20_boost_and_cooldown';
import { runBlanketModeTest } from '../mcp/scenarios/25_blanket_mode';
import { runEnergyMeterTest } from '../mcp/scenarios/40_energy_meter';
import { runApiEndpointsTest } from '../mcp/scenarios/95_api_endpoints';
import { runUiInteractionsTest } from '../mcp/scenarios/100_ui_interactions';

const FIXED_SCENARIOS = [
  { name: '10_effort_bands', fn: runEffortBandsTest },
  { name: '20_boost_and_cooldown', fn: runBoostAndCooldownTest },
  { name: '25_blanket_mode', fn: runBlanketModeTest },
  { name: '40_energy_meter', fn: runEnergyMeterTest },
  { name: '95_api_endpoints', fn: runApiEndpointsTest },
  { name: '100_ui_interactions', fn: runUiInteractionsTest },
];

const RETRIES = 2; // Run each scenario twice

interface ScenarioResult {
  name: string;
  run1: { passed: boolean; duration: number };
  run2: { passed: boolean; duration: number };
  flaky: boolean;
}

async function runScenarioWithRetry(
  scenario: { name: string; fn: any },
  env: TestEnv,
  runNumber: number
): Promise<{ passed: boolean; duration: number }> {
  const client = await createMCPClient(env);
  const startTime = Date.now();
  
  try {
    const result = await scenario.fn(client);
    const duration = Date.now() - startTime;
    await client.close();
    return { passed: result.passed, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    await client.close();
    console.error(`❌ ${scenario.name} (run ${runNumber}) failed:`, error.message);
    return { passed: false, duration };
  }
}

async function main() {
  console.log('🛡️  Flake Guard: Rerunning 6 fixed scenarios to detect non-determinism...\n');

  const env = loadEnv();
  const results: ScenarioResult[] = [];

  for (const scenario of FIXED_SCENARIOS) {
    console.log(`\n🔄 Testing ${scenario.name}...`);
    
    // Run 1
    console.log(`  Run 1/2...`);
    const run1 = await runScenarioWithRetry(scenario, env, 1);
    const icon1 = run1.passed ? '✅' : '❌';
    console.log(`  ${icon1} Run 1: ${run1.passed ? 'PASSED' : 'FAILED'} (${run1.duration}ms)`);

    // Small delay between runs
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Run 2
    console.log(`  Run 2/2...`);
    const run2 = await runScenarioWithRetry(scenario, env, 2);
    const icon2 = run2.passed ? '✅' : '❌';
    console.log(`  ${icon2} Run 2: ${run2.passed ? 'PASSED' : 'FAILED'} (${run2.duration}ms)`);

    // Check for flakiness
    const flaky = run1.passed !== run2.passed;
    if (flaky) {
      console.log(`  ⚠️  FLAKY: Results differ between runs!`);
    }

    results.push({
      name: scenario.name,
      run1,
      run2,
      flaky,
    });
  }

  // Summary
  console.log('\n📊 Flake Guard Results:\n');
  const flakyScenarios = results.filter((r) => r.flaky);
  const failedScenarios = results.filter((r) => !r.run1.passed || !r.run2.passed);

  results.forEach((result) => {
    const status = result.flaky
      ? '⚠️  FLAKY'
      : result.run1.passed && result.run2.passed
      ? '✅ STABLE'
      : '❌ FAILED';
    console.log(`${status} ${result.name}`);
  });

  console.log(`\n📈 Summary: ${results.length - flakyScenarios.length - failedScenarios.length} stable, ${flakyScenarios.length} flaky, ${failedScenarios.length} failed\n`);

  // Fail CI if any flakiness or failures detected
  if (flakyScenarios.length > 0 || failedScenarios.length > 0) {
    console.error('❌ Flake guard FAILED');
    if (flakyScenarios.length > 0) {
      console.error('\n⚠️  Flaky scenarios (non-deterministic):');
      flakyScenarios.forEach((s) => {
        console.error(`  - ${s.name}: Run 1 ${s.run1.passed ? 'PASSED' : 'FAILED'}, Run 2 ${s.run2.passed ? 'PASSED' : 'FAILED'}`);
      });
    }
    if (failedScenarios.length > 0) {
      console.error('\n❌ Failed scenarios:');
      failedScenarios.forEach((s) => {
        console.error(`  - ${s.name}: Run 1 ${s.run1.passed ? 'PASSED' : 'FAILED'}, Run 2 ${s.run2.passed ? 'PASSED' : 'FAILED'}`);
      });
    }
    process.exit(1);
  }

  console.log('✅ Flake guard PASSED - All scenarios stable across retries');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Flake guard error:', error);
  process.exit(1);
});

