/**
 * Metrics utilities for live LLM tests
 * Latency budgets and text quality checks
 */

/**
 * Calculate Shannon entropy of text (bits per character)
 * Higher entropy = less predictable, guards against echoes
 */
export function calculateEntropy(text: string): number {
  if (!text || text.length === 0) return 0;

  const freq: Record<string, number> = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const length = text.length;

  for (const count of Object.values(freq)) {
    const probability = count / length;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  }

  return entropy;
}

/**
 * Check text length and entropy
 * Returns length and entropy, throws if below thresholds
 */
export function lengthAndEntropy(text: string): { length: number; entropy: number } {
  const length = text.trim().length;
  const entropy = calculateEntropy(text);

  if (length < 10) {
    throw new Error(`Text too short: ${length} chars (minimum 10)`);
  }

  if (entropy < 2.2) {
    throw new Error(
      `Text entropy too low: ${entropy.toFixed(2)} bits/char (minimum 2.2). Text may be an echo or too predictable.`
    );
  }

  return { length, entropy };
}

/**
 * Assert latency is within budget
 */
export function latencyBudget(actualMs: number, budgetMs: number): void {
  if (actualMs > budgetMs) {
    throw new Error(
      `Latency ${actualMs}ms exceeds budget ${budgetMs}ms (${((actualMs / budgetMs) * 100).toFixed(1)}% over)`
    );
  }
}

/**
 * Measure time between two timestamps
 */
export function measureLatency(startMs: number, endMs: number): number {
  return endMs - startMs;
}

/**
 * Performance SLO assertions
 * Split budgets: UI time-to-typing-indicator ≤ 1.5s, first-token ≤ 5s, total ≤ 20s
 */
export interface SLOMetrics {
  uiToTypingMs: number;
  firstTokenMs: number;
  totalMs: number;
}

export function assertSLO(metrics: SLOMetrics): void {
  if (metrics.uiToTypingMs > 1500) {
    throw new Error(`UI to typing indicator SLO breach: ${metrics.uiToTypingMs}ms (budget: 1500ms)`);
  }
  if (metrics.firstTokenMs > 5000) {
    throw new Error(`First token SLO breach: ${metrics.firstTokenMs}ms (budget: 5000ms)`);
  }
  if (metrics.totalMs > 20000) {
    throw new Error(`Total SLO breach: ${metrics.totalMs}ms (budget: 20000ms)`);
  }
}

/**
 * Calculate percentiles from array of values
 */
export function calculatePercentiles(values: number[]): { p50: number; p95: number } {
  if (values.length === 0) return { p50: 0, p95: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.floor(sorted.length * 0.95);
  
  return {
    p50: sorted[p50Index] || 0,
    p95: sorted[p95Index] || sorted[sorted.length - 1] || 0,
  };
}

/**
 * Cost guardrail - fail if tokens exceed ceiling
 */
export function assertCostGuardrail(
  totalTokens: number,
  maxTokensPerRequest: number = 200
): void {
  if (totalTokens > maxTokensPerRequest) {
    throw new Error(
      `Cost guardrail breach: ${totalTokens} tokens (max: ${maxTokensPerRequest}). Model default may have changed.`
    );
  }
}
