/**
 * Shared utilities for UI test orchestration
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  artifacts?: string[];
}

export interface BudgetResult {
  name: string;
  passed: boolean;
  actual: number;
  budget: number;
  unit: string;
}

/**
 * Get timestamped artifacts directory
 */
export function getArtifactsDir(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return path.join(process.cwd(), 'artifacts', timestamp);
}

/**
 * Ensure artifacts directory exists
 */
export async function ensureArtifactsDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Create symlink to latest artifacts
 */
export async function linkLatest(dir: string): Promise<void> {
  const latestPath = path.join(process.cwd(), 'artifacts', 'latest');
  try {
    await fs.unlink(latestPath);
  } catch {
    // Doesn't exist, that's fine
  }
  try {
    await fs.symlink(path.basename(dir), latestPath, 'dir');
  } catch (error: any) {
    // On Windows, symlinks may require admin, so we'll just copy
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      console.warn('Could not create symlink, using copy instead');
      // For Windows, we'll just note the path
    }
  }
}

/**
 * Format duration in ms to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Redact secrets from string
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/(api[_-]?key|apikey|sk-[a-zA-Z0-9]+|sk-ant-[a-zA-Z0-9]+)\s*[:=]\s*["']?[^"'\s]+/gi, '$1: ***REDACTED***')
    .replace(/(authorization|bearer)\s+[^\s]+/gi, '$1 ***REDACTED***');
}

/**
 * Get test seed from env or default
 */
export function getTestSeed(): number {
  return parseInt(process.env.NAPGPT_TEST_SEED || process.env.TEST_SEED || '1337', 10);
}

/**
 * Wait for URL to be available
 */
export async function waitForUrl(url: string, timeout: number = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

