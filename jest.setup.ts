/**
 * Jest setup: extend expect, register image snapshot, configure global artifact dir, console gate
 */

import { toMatchImageSnapshot } from 'jest-image-snapshot';
import * as fs from 'fs/promises';
import * as path from 'path';
import { installFakeTimers, uninstallFakeTimers } from './tests/utils/clock';
import { initRng, resetRng } from './tests/utils/rng';

// Extend Jest matchers
expect.extend({ toMatchImageSnapshot });

// Ensure artifact directory exists
const artifactDir = process.env.UI_ARTIFACT_DIR || 'artifacts/ui-test';
const screensDir = path.join(artifactDir, 'screens');
const harDir = path.join(artifactDir, 'har');
const logsDir = path.join(artifactDir, 'logs');

async function ensureArtifactDirs() {
  await fs.mkdir(screensDir, { recursive: true });
  await fs.mkdir(harDir, { recursive: true });
  await fs.mkdir(logsDir, { recursive: true });
}

// Run before all tests
beforeAll(async () => {
  await ensureArtifactDirs();

  // Initialize fake timers for deterministic tests
  installFakeTimers(Date.now());

  // Initialize seeded RNG
  const seed = process.env.TEST_SEED ? parseInt(process.env.TEST_SEED, 10) : 12345;
  initRng(seed);
});

// Cleanup after all tests
afterAll(async () => {
  uninstallFakeTimers();
  resetRng();
});

// Global test utilities available to all tests
(global as any).UI_ARTIFACT_DIR = artifactDir;
(global as any).SCREENS_DIR = screensDir;
(global as any).HAR_DIR = harDir;
(global as any).LOGS_DIR = logsDir;

// Redact sensitive env vars from snapshots/logs
if (process.env.LLM_API_KEY) {
  // Replace in any string outputs
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const redacted = args.map((arg) => {
      if (typeof arg === 'string') {
        return arg.replace(
          /(api[_-]?key|apikey|sk-[a-zA-Z0-9]+|sk-ant-[a-zA-Z0-9]+)\s*[:=]\s*["']?[^"'\s]+/gi,
          '$1: ***REDACTED***'
        );
      }
      return arg;
    });
    originalLog(...redacted);
  };
}

// Redact secrets from environment in logs
const originalEnv = { ...process.env };
process.env = new Proxy(process.env, {
  get(target, prop) {
    const value = target[prop as string];
    if (typeof prop === 'string' && /API[_-]?KEY|SECRET|TOKEN/i.test(prop)) {
      return value ? '***' : undefined;
    }
    return value;
  },
});

// Restore original env after tests
afterAll(() => {
  process.env = originalEnv;
});
