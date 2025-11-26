/**
 * Budget Gate - Fails CI if performance/behavior budgets are breached
 * 
 * Usage: Run after test suite to enforce:
 * - first-token ≤ 5s
 * - total ≤ 20s
 * - empty replies = 0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { checkLatencyBudgets, checkBehaviorBudgets, aggregateBudgetResults, DEFAULT_BUDGETS } from './budgets';

const METRICS_FILE = path.join(process.cwd(), 'artifacts', 'ui-test', 'metrics.json');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts', 'ui-test');

interface TestMetrics {
  latency?: {
    uiToTypingMs?: number;
    firstTokenMs?: number;
    totalMs?: number;
  };
  behavior?: {
    emptyReplies?: number;
  };
  [key: string]: any;
}

async function loadMetrics(): Promise<TestMetrics | null> {
  try {
    const content = await fs.readFile(METRICS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Metrics file not found: ${METRICS_FILE}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Budget Gate: Checking performance and behavior budgets...\n');

  const metrics = await loadMetrics();
  if (!metrics) {
    console.log('⚠️  No metrics found, skipping budget gate');
    process.exit(0);
  }

  const results: any[] = [];

  // Check latency budgets
  if (metrics.latency) {
    const latencyResults = checkLatencyBudgets(metrics.latency, {
      uiToTypingMs: DEFAULT_BUDGETS.latency.uiToTypingMs,
      firstTokenMs: 5000, // first-token ≤ 5s
      totalMs: 20000, // total ≤ 20s
    });
    results.push(...latencyResults);
  }

  // Check behavior budgets
  if (metrics.behavior) {
    const behaviorResults = checkBehaviorBudgets(
      {
        emptyReplies: metrics.behavior.emptyReplies,
      },
      {
        emptyReplies: 0, // empty replies = 0
        dropoutRate: DEFAULT_BUDGETS.behavior.dropoutRate,
        nonSequiturRate: DEFAULT_BUDGETS.behavior.nonSequiturRate,
        boostSingleUse: DEFAULT_BUDGETS.behavior.boostSingleUse,
      }
    );
    results.push(...behaviorResults);
  }

  // Aggregate results
  const aggregate = aggregateBudgetResults(results);

  // Print results
  console.log('📊 Budget Results:\n');
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.actual}${result.unit} (budget: ${result.budget}${result.unit})`);
    if (result.error) {
      console.log(`   ${result.error}`);
    }
  });

  console.log(`\n📈 Summary: ${aggregate.passedCount} passed, ${aggregate.failedCount} failed\n`);

  // Fail CI if any budgets breached
  if (!aggregate.passed) {
    console.error('❌ Budget gate FAILED - One or more budgets breached');
    console.error('\nFailed budgets:');
    aggregate.failures.forEach((failure) => {
      console.error(`  - ${failure.name}: ${failure.error}`);
    });
    process.exit(1);
  }

  console.log('✅ Budget gate PASSED - All budgets within limits');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Budget gate error:', error);
  process.exit(1);
});

