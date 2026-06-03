/**
 * Jest setup: extend expect, register image snapshot, configure global artifact dir, console gate
 */

import { toMatchImageSnapshot } from 'jest-image-snapshot';
import * as fs from 'fs/promises';
import * as path from 'path';
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

  // Initialize seeded RNG for deterministic tests
  const seed = process.env.TEST_SEED ? parseInt(process.env.TEST_SEED, 10) : 12345;
  initRng(seed);
});

// Cleanup after all tests
afterAll(async () => {
  resetRng();
});

// Clear persisted app state before each test. jest-puppeteer shares a single
// page across all spec files, and the app persists chat history and nap state
// to localStorage — without this, messages from one spec bleed into the next
// (e.g. a11y.spec's message appearing in chat.e2e), which flakes depending on
// jest's file ordering. Runs before each spec's own page.goto, so the reload
// starts from a clean origin.
beforeEach(async () => {
  const page = (global as any).page;
  if (!page) return;
  try {
    await page.evaluate(() => {
      try { window.localStorage?.clear(); } catch {}
      try { window.sessionStorage?.clear(); } catch {}
    });
  } catch {
    // Page may be on about:blank (no storage origin yet) — nothing to clear.
  }
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
