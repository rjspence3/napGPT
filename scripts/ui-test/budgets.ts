/**
 * Budget enforcement for UI tests
 */

import type { TestResult } from './utils';

export interface BudgetConfig {
  latency: {
    uiToTypingMs: number;
    firstTokenMs: number;
    totalMs: number;
  };
  behavior: {
    emptyReplies: number;
    dropoutRate: number;
    nonSequiturRate: number;
    boostSingleUse: number;
  };
  a11y: {
    criticalViolations: number;
    seriousViolations: number;
  };
  perf: {
    lighthouseScore: number;
  };
  cost: {
    maxTokensPerRun: number;
  };
}

export const DEFAULT_BUDGETS: BudgetConfig = {
  latency: {
    uiToTypingMs: 1500,
    firstTokenMs: 5000,
    totalMs: 20000,
  },
  behavior: {
    emptyReplies: 0,
    dropoutRate: 0.15,
    nonSequiturRate: 0.12,
    boostSingleUse: 1.0,
  },
  a11y: {
    criticalViolations: 0,
    seriousViolations: 0,
  },
  perf: {
    lighthouseScore: 70,
  },
  cost: {
    maxTokensPerRun: 1000, // Configurable via env
  },
};

export interface BudgetResult {
  name: string;
  passed: boolean;
  actual: number;
  budget: number;
  unit: string;
  error?: string;
}

/**
 * Check latency budgets
 */
export function checkLatencyBudgets(
  metrics: { uiToTypingMs?: number; firstTokenMs?: number; totalMs?: number },
  budgets = DEFAULT_BUDGETS.latency
): BudgetResult[] {
  const results: BudgetResult[] = [];

  if (metrics.uiToTypingMs !== undefined) {
    const passed = metrics.uiToTypingMs <= budgets.uiToTypingMs;
    results.push({
      name: 'UI to Typing Indicator',
      passed,
      actual: metrics.uiToTypingMs,
      budget: budgets.uiToTypingMs,
      unit: 'ms',
      error: passed ? undefined : `Exceeded by ${metrics.uiToTypingMs - budgets.uiToTypingMs}ms`,
    });
  }

  if (metrics.firstTokenMs !== undefined) {
    const passed = metrics.firstTokenMs <= budgets.firstTokenMs;
    results.push({
      name: 'First Token',
      passed,
      actual: metrics.firstTokenMs,
      budget: budgets.firstTokenMs,
      unit: 'ms',
      error: passed ? undefined : `Exceeded by ${metrics.firstTokenMs - budgets.firstTokenMs}ms`,
    });
  }

  if (metrics.totalMs !== undefined) {
    const passed = metrics.totalMs <= budgets.totalMs;
    results.push({
      name: 'Total Response',
      passed,
      actual: metrics.totalMs,
      budget: budgets.totalMs,
      unit: 'ms',
      error: passed ? undefined : `Exceeded by ${metrics.totalMs - budgets.totalMs}ms`,
    });
  }

  return results;
}

/**
 * Check behavior budgets
 */
export function checkBehaviorBudgets(
  stats: {
    emptyReplies?: number;
    dropoutRate?: number;
    nonSequiturRate?: number;
    boostSingleUse?: number;
  },
  budgets = DEFAULT_BUDGETS.behavior
): BudgetResult[] {
  const results: BudgetResult[] = [];

  if (stats.emptyReplies !== undefined) {
    const passed = stats.emptyReplies <= budgets.emptyReplies;
    results.push({
      name: 'Empty Replies',
      passed,
      actual: stats.emptyReplies,
      budget: budgets.emptyReplies,
      unit: 'count',
      error: passed ? undefined : `Found ${stats.emptyReplies} empty replies`,
    });
  }

  if (stats.dropoutRate !== undefined) {
    const passed = stats.dropoutRate <= budgets.dropoutRate;
    results.push({
      name: 'Dropout Rate',
      passed,
      actual: stats.dropoutRate,
      budget: budgets.dropoutRate,
      unit: 'ratio',
      error: passed ? undefined : `Rate ${(stats.dropoutRate * 100).toFixed(1)}% exceeds ${(budgets.dropoutRate * 100).toFixed(1)}%`,
    });
  }

  if (stats.nonSequiturRate !== undefined) {
    const passed = stats.nonSequiturRate <= budgets.nonSequiturRate;
    results.push({
      name: 'Non-Sequitur Rate',
      passed,
      actual: stats.nonSequiturRate,
      budget: budgets.nonSequiturRate,
      unit: 'ratio',
      error: passed ? undefined : `Rate ${(stats.nonSequiturRate * 100).toFixed(1)}% exceeds ${(budgets.nonSequiturRate * 100).toFixed(1)}%`,
    });
  }

  if (stats.boostSingleUse !== undefined) {
    const passed = stats.boostSingleUse >= budgets.boostSingleUse;
    results.push({
      name: 'Boost Single-Use',
      passed,
      actual: stats.boostSingleUse,
      budget: budgets.boostSingleUse,
      unit: 'ratio',
      error: passed ? undefined : `Rate ${(stats.boostSingleUse * 100).toFixed(1)}% below ${(budgets.boostSingleUse * 100).toFixed(1)}%`,
    });
  }

  return results;
}

/**
 * Check a11y budgets
 */
export function checkA11yBudgets(
  violations: { critical?: number; serious?: number },
  budgets = DEFAULT_BUDGETS.a11y
): BudgetResult[] {
  const results: BudgetResult[] = [];

  if (violations.critical !== undefined) {
    const passed = violations.critical <= budgets.criticalViolations;
    results.push({
      name: 'A11y Critical Violations',
      passed,
      actual: violations.critical,
      budget: budgets.criticalViolations,
      unit: 'count',
      error: passed ? undefined : `Found ${violations.critical} critical violations`,
    });
  }

  if (violations.serious !== undefined) {
    const passed = violations.serious <= budgets.seriousViolations;
    results.push({
      name: 'A11y Serious Violations',
      passed,
      actual: violations.serious,
      budget: budgets.seriousViolations,
      unit: 'count',
      error: passed ? undefined : `Found ${violations.serious} serious violations`,
    });
  }

  return results;
}

/**
 * Check performance budgets
 */
export function checkPerfBudgets(
  score: number,
  budget = DEFAULT_BUDGETS.perf.lighthouseScore
): BudgetResult[] {
  const passed = score >= budget;
  return [
    {
      name: 'Lighthouse Performance',
      passed,
      actual: score,
      budget,
      unit: 'score',
      error: passed ? undefined : `Score ${score} below ${budget}`,
    },
  ];
}

/**
 * Check cost budgets
 */
export function checkCostBudgets(
  totalTokens: number,
  budget: number
): BudgetResult[] {
  const passed = totalTokens <= budget;
  return [
    {
      name: 'Total Tokens',
      passed,
      actual: totalTokens,
      budget,
      unit: 'tokens',
      error: passed ? undefined : `Tokens ${totalTokens} exceed ${budget}`,
    },
  ];
}

/**
 * Aggregate all budget results
 */
export function aggregateBudgetResults(results: BudgetResult[]): {
  passed: boolean;
  passedCount: number;
  failedCount: number;
  failures: BudgetResult[];
} {
  const failures = results.filter((r) => !r.passed);
  return {
    passed: failures.length === 0,
    passedCount: results.length - failures.length,
    failedCount: failures.length,
    failures,
  };
}

