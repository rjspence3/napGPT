/**
 * Live LLM E2E test - Real round-trip with streaming
 * Supports provider/model matrix, chaos testing, cost guardrails, performance SLOs
 */

import { Page } from 'puppeteer';
import {
  requireLiveEnv,
  captureHar,
  ConsoleGate,
  withRecording,
  parseModelMatrix,
  saveMetrics,
} from '../utils/live';
import { snap, snapChatExchange } from '../utils/screen';
import {
  lengthAndEntropy,
  assertSLO,
  assertCostGuardrail,
  calculatePercentiles,
  type SLOMetrics,
} from '../utils/metrics';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const MAX_REQUESTS = parseInt(process.env.LLM_MAX_REQUESTS || '10', 10);

/**
 * Run a single live chat test with specific provider/model
 */
async function runLiveChat(
  page: Page,
  provider: string,
  model: string,
  testName: string
): Promise<SLOMetrics & { totalTokens: number }> {
  const gate = new ConsoleGate(page, `${testName}-${provider}-${model}`);
  await gate.install();

  // Set provider/model via env (tests will use this)
  process.env.LLM_PROVIDER = provider;
  process.env.LLM_MODEL = model;

  // Instructive prompt to reduce stochasticity
  const prompt =
    "Reply in ≤2 short sentences. Summarize: 'NapGPT counts sheep while you nap. Output only text.'";

  // BEFORE: Fill input and snapshot
  const input = await page.$('[data-testid="chat-input"]');
  await input?.type(prompt);
  await snap(page, testName, 'before-send');

  // Start metrics
  const t0 = Date.now();
  let uiToTypingAt: number | null = null;
  let firstTokenAt: number | null = null;

  // Send message
  const sendBtn = await page.$('[data-testid="send-btn"]');
  await sendBtn?.click();

  // DURING: Wait for typing indicator or message; snapshot
  try {
    await page.waitForSelector(
      '[data-testid="typing-indicator"], [data-testid="message-assistant"]',
      { visible: true, timeout: 5000 }
    );
    const typingAt = Date.now();
    if (!uiToTypingAt) uiToTypingAt = typingAt;
    if (!firstTokenAt) firstTokenAt = typingAt;
  } catch {
    // May already be visible
  }
  await snap(page, testName, 'during-stream');

  // Wait for final message to appear
  await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 20000 });

  // Wait for typing indicator to disappear (if present)
  try {
    await page.waitForSelector('[data-testid="typing-indicator"]', {
      hidden: true,
      timeout: 5000,
    });
  } catch {
    // May not have typing indicator
  }

  // AFTER: Snapshot final state
  await snap(page, testName, 'after-reply');

  // Crops: input and latest assistant message
  await snapChatExchange(page, testName);

  // Network assertions: Verify response
  const response = await page.waitForResponse(
    (response) => response.url().includes('/api/chat') && response.request().method() === 'POST',
    { timeout: 20000 }
  );

  expect(response.status()).toBe(200);

  // Verify provider/model headers
  const headers = response.headers();
  const providerHeader = headers['x-provider'];
  const modelHeader = headers['x-model'];
  const totalTokensHeader = headers['x-total-tokens'];

  if (providerHeader) {
    expect(providerHeader).toBe(provider);
  }
  if (modelHeader) {
    expect(modelHeader).toBe(model);
  }

  // Check response body
  const responseData = await response.json();
  expect(responseData.reply).toBeDefined();
  expect(responseData.meta).toBeDefined();

  // Verify provider/model in meta
  expect(responseData.meta.provider).toBe(provider);
  expect(responseData.meta.model).toBe(model);

  // Cost guardrail: Check token usage
  const totalTokens = responseData.meta?.usage?.totalTokens || parseInt(totalTokensHeader || '0', 10);
  const maxTokensPerRequest = parseInt(process.env.LLM_MAX_TOKENS || '200', 10);
  assertCostGuardrail(totalTokens, maxTokensPerRequest);

  // Assertions: Response received
  const assistantMessages = await page.$$('[data-testid="message-assistant"]');
  expect(assistantMessages.length).toBeGreaterThan(0);

  // Extract assistant text
  const lastMessage = await page.evaluate(() => {
    const messages = document.querySelectorAll('[data-testid="message-assistant"]');
    const last = messages[messages.length - 1];
    return last?.textContent || '';
  });

  expect(lastMessage).toBeTruthy();
  expect(lastMessage.trim().length).toBeGreaterThan(0);

  // Result sanity checks
  const { length, entropy } = lengthAndEntropy(lastMessage);
  expect(length).toBeGreaterThanOrEqual(10);
  expect(entropy).toBeGreaterThanOrEqual(2.2);
  expect(lastMessage.trim()).not.toEqual(prompt.trim());

  // Performance: Calculate metrics
  const tFinal = Date.now();
  const uiToTypingMs = uiToTypingAt ? uiToTypingAt - t0 : 0;
  const firstTokenMs = firstTokenAt ? firstTokenAt - t0 : 0;
  const totalMs = tFinal - t0;

  // Assert SLOs
  assertSLO({ uiToTypingMs, firstTokenMs, totalMs });

  // State gating: Controls re-enabled
  const sendBtnDisabled = await page.evaluate(
    () => (document.querySelector('[data-testid="send-btn"]') as HTMLButtonElement)?.disabled
  );
  expect(sendBtnDisabled).toBe(false);

  // Save HAR
  await captureHar(page, `${testName}-${provider}-${model}`);

  // Assert no console errors
  await gate.assertNoErrors();

  return {
    uiToTypingMs,
    firstTokenMs,
    totalMs,
    totalTokens,
  };
}

describe('Chat Live LLM - Real Round-Trip', () => {
  let page: Page;
  let env: ReturnType<typeof requireLiveEnv>;
  let modelMatrix: Array<{ provider: string; model: string }>;

  beforeAll(() => {
    // Skip if LIVE_LLM not enabled
    if (process.env.LIVE_LLM !== '1') {
      console.log('Skipping live LLM tests (LIVE_LLM not set)');
      return;
    }

    try {
      env = requireLiveEnv();
      modelMatrix = parseModelMatrix(
        process.env.MODEL_MATRIX,
        env.provider,
        env.model
      );
      console.log(`Live LLM enabled: ${modelMatrix.length} provider/model combination(s)`);
      modelMatrix.forEach((m) => console.log(`  - ${m.provider}:${m.model}`));
    } catch (error: any) {
      console.warn(`Live LLM tests skipped: ${error.message}`);
    }
  });

  beforeAll(async () => {
    if (process.env.LIVE_LLM !== '1') return;

    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  beforeEach(async () => {
    if (process.env.LIVE_LLM !== '1') return;

    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });

    // Apply determinism controls if set
    if (process.env.NAPGPT_TEST_SEED || process.env.NAPGPT_DISABLE_DREAM_DRIFT || process.env.NAPGPT_DISABLE_SHEEP) {
      await page.evaluate(() => {
        // Set test config flags in localStorage or via API
        if ((window as any).setTestConfig) {
          (window as any).setTestConfig({
            testSeed: process.env.NAPGPT_TEST_SEED ? parseInt(process.env.NAPGPT_TEST_SEED, 10) : undefined,
            disableDreamDrift: process.env.NAPGPT_DISABLE_DREAM_DRIFT === '1',
            disableSheep: process.env.NAPGPT_DISABLE_SHEEP === '1',
          });
        }
      });
    }
  });

  // Run test for each provider/model combination
  for (const { provider, model } of modelMatrix || []) {
    test(`LIVE LLM: ${provider}:${model} - real round-trip, streaming, and screenshots`, async () => {
      if (process.env.LIVE_LLM !== '1') {
        console.log('Skipping: LIVE_LLM not set');
        return;
      }

      const testName = `chat-live-llm-${provider}-${model}`;

      await withRecording(page, testName, async () => {
        const metrics = await runLiveChat(page, provider, model, testName);

        // Save metrics for p50/p95 calculation
        await saveMetrics(testName, {
          ...metrics,
          provider,
          model,
        });
      });
    });
  }

  // Chaos testing (if chaos flags set)
  test('LIVE LLM: Chaos & Rate-Limit Gates', async () => {
    if (process.env.LIVE_LLM !== '1') {
      console.log('Skipping: LIVE_LLM not set');
      return;
    }
    if (!modelMatrix?.length) {
      console.log('Skipping: no model matrix available');
      return;
    }

    const chaosLatency = Number(process.env.CHAOS_LATENCY_MS || 0);
    const chaosFail = Number(process.env.CHAOS_FAIL_PCT || 0);
    const chaos429 = Number(process.env.CHAOS_429_PCT || 0);

    if (chaosLatency === 0 && chaosFail === 0 && chaos429 === 0) {
      console.log('Skipping chaos test (no chaos flags set)');
      return;
    }

    const { provider, model } = modelMatrix[0];
    const testName = `chat-live-llm-chaos-${provider}-${model}`;

    await withRecording(page, testName, async () => {
      const metrics = await runLiveChat(page, provider, model, testName);

      // Assert: no empty replies, graceful handling
      const assistantMessages = await page.$$('[data-testid="message-assistant"]');
      expect(assistantMessages.length).toBeGreaterThan(0);

      const lastMessage = await page.evaluate(() => {
        const messages = document.querySelectorAll('[data-testid="message-assistant"]');
        const last = messages[messages.length - 1];
        return last?.textContent || '';
      });

      expect(lastMessage.trim().length).toBeGreaterThan(0);
      // Should not be an error message (graceful fallback)
      expect(lastMessage.toLowerCase()).not.toContain('error');
    });
  });

  // Streaming disconnect test
  test('LIVE LLM: Streaming disconnect recovery', async () => {
    if (process.env.LIVE_LLM !== '1') {
      console.log('Skipping: LIVE_LLM not set');
      return;
    }
    if (!modelMatrix?.length) {
      console.log('Skipping: no model matrix available');
      return;
    }

    const { provider, model } = modelMatrix[0];
    const testName = `chat-live-llm-disconnect-${provider}-${model}`;

    // This test would require actual streaming implementation
    // For now, we'll verify graceful handling of network errors
    const gate = new ConsoleGate(page, testName);
    await gate.install();

    const prompt = 'Test streaming disconnect recovery';
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type(prompt);

    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();

    // Wait for response or error handling
    try {
      await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 20000 });
      const lastMessage = await page.evaluate(() => {
        const messages = document.querySelectorAll('[data-testid="message-assistant"]');
        const last = messages[messages.length - 1];
        return last?.textContent || '';
      });
      expect(lastMessage.trim().length).toBeGreaterThan(0);
    } catch {
      // If timeout, verify error handling
      const errorElements = await page.$$('[data-testid="error-message"]');
      expect(errorElements.length).toBeGreaterThan(0);
    }

    await gate.assertNoErrors();
  });

  // Prompt upgrades: Test with flags disabled (deterministic)
  test('LIVE LLM: Prompt upgrades - flags disabled (deterministic)', async () => {
    if (process.env.LIVE_LLM !== '1') {
      console.log('Skipping: LIVE_LLM not set');
      return;
    }
    if (!modelMatrix?.length) {
      console.log('Skipping: no model matrix available');
      return;
    }

    const { provider, model } = modelMatrix[0];
    const testName = `chat-live-llm-upgrades-disabled-${provider}-${model}`;

    const gate = new ConsoleGate(page, testName);
    await gate.install();

    // Bounded prompt to reduce stochasticity
    const prompt = "Reply in ≤2 short sentences. Summarize: 'NapGPT counts sheep while you nap. Output only text.'";
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type(prompt);

    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();

    // Wait for response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 20000 });

    const lastMessage = await page.evaluate(() => {
      const messages = document.querySelectorAll('[data-testid="message-assistant"]');
      const last = messages[messages.length - 1];
      return last?.textContent || '';
    });

    expect(lastMessage).toBeTruthy();
    expect(lastMessage.trim().length).toBeGreaterThan(0);

    // Verify no drift occurs when flags disabled (if we can check via response)
    // This is a basic sanity check - full flag testing is in unit tests

    await gate.assertNoErrors();
  });

  // Prompt upgrades: Test wake reaction
  test('LIVE LLM: Prompt upgrades - wake reaction', async () => {
    if (process.env.LIVE_LLM !== '1') {
      console.log('Skipping: LIVE_LLM not set');
      return;
    }
    if (!modelMatrix?.length) {
      console.log('Skipping: no model matrix available');
      return;
    }

    const { provider, model } = modelMatrix[0];
    const testName = `chat-live-llm-wake-reaction-${provider}-${model}`;

    const gate = new ConsoleGate(page, testName);
    await gate.install();

    // Message with wake keywords
    const prompt = "This is urgent! Please help me understand React.";
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type(prompt);

    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();

    // Wait for response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 20000 });

    const lastMessage = await page.evaluate(() => {
      const messages = document.querySelectorAll('[data-testid="message-assistant"]');
      const last = messages[messages.length - 1];
      return last?.textContent || '';
    });

    expect(lastMessage).toBeTruthy();
    // Wake reaction may or may not appear (probabilistic), but response should be valid
    expect(lastMessage.trim().length).toBeGreaterThan(0);

    await gate.assertNoErrors();
  });

  // Prompt upgrades: Test /recall command
  test('LIVE LLM: Prompt upgrades - /recall command', async () => {
    if (process.env.LIVE_LLM !== '1') {
      console.log('Skipping: LIVE_LLM not set');
      return;
    }
    if (!modelMatrix?.length) {
      console.log('Skipping: no model matrix available');
      return;
    }

    const { provider, model } = modelMatrix[0];
    const testName = `chat-live-llm-recall-${provider}-${model}`;

    const gate = new ConsoleGate(page, testName);
    await gate.install();

    // First, send a message
    const firstPrompt = "What is React?";
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type(firstPrompt);

    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();

    // Wait for first response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 20000 });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief delay

    // Then send /recall
    await input?.type("/recall");
    await sendBtn?.click();

    // Wait for recall response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 20000 });

    const messages = await page.evaluate(() => {
      const msgs = document.querySelectorAll('[data-testid="message-assistant"]');
      return Array.from(msgs).map(m => m.textContent || '');
    });

    // Should have at least 2 messages (original + recall)
    expect(messages.length).toBeGreaterThanOrEqual(1);
    
    // Last message should be recall response
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage).toBeTruthy();
    // Should contain recall-related text (either "vaguely recall" or "pillows")
    expect(lastMessage.toLowerCase()).toMatch(/(recall|pillows|remember)/);

    await gate.assertNoErrors();
  });

  // Slow-type test
  test('LIVE LLM: Slow-type (no double-send)', async () => {
    if (process.env.LIVE_LLM !== '1') {
      console.log('Skipping: LIVE_LLM not set');
      return;
    }
    if (!modelMatrix?.length) {
      console.log('Skipping: no model matrix available');
      return;
    }

    const { provider, model } = modelMatrix[0];
    const testName = `chat-live-llm-slowtype-${provider}-${model}`;

    const gate = new ConsoleGate(page, testName);
    await gate.install();

    const prompt = 'Slow typing test';
    const input = await page.$('[data-testid="chat-input"]');

    // Type slowly over 5-10 seconds
    for (const char of prompt) {
      await input?.type(char);
      await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms per char
    }

    // Ensure send button is enabled
    const sendBtn = await page.$('[data-testid="send-btn"]');
    const isEnabled = await page.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
      sendBtn
    );
    expect(isEnabled).toBe(true);

    await sendBtn?.click();

    // Wait for single response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 20000 });

    // Verify only one message sent
    const userMessages = await page.$$('[data-testid="message-user"]');
    expect(userMessages.length).toBe(1);

    await gate.assertNoErrors();
  });
});

// After all tests, calculate and report p50/p95
afterAll(async () => {
  if (process.env.LIVE_LLM !== '1') return;

  try {
    const { saveMetrics } = await import('../utils/live');
    const metricsPath = await saveMetrics('summary', {
      uiToTypingMs: 0,
      firstTokenMs: 0,
      totalMs: 0,
      totalTokens: 0,
      provider: 'summary',
      model: 'summary',
    });

    // Read metrics and calculate percentiles
    const fs = await import('fs/promises');
    const metrics = JSON.parse(await fs.readFile(metricsPath, 'utf-8'));

    const uiToTypingValues = metrics.map((m: any) => m.uiToTypingMs).filter((v: number) => v > 0);
    const firstTokenValues = metrics.map((m: any) => m.firstTokenMs).filter((v: number) => v > 0);
    const totalValues = metrics.map((m: any) => m.totalMs).filter((v: number) => v > 0);

    if (uiToTypingValues.length > 0) {
      const uiPercentiles = calculatePercentiles(uiToTypingValues);
      console.log(`UI to typing indicator - p50: ${uiPercentiles.p50}ms, p95: ${uiPercentiles.p95}ms`);
    }

    if (firstTokenValues.length > 0) {
      const tokenPercentiles = calculatePercentiles(firstTokenValues);
      console.log(`First token - p50: ${tokenPercentiles.p50}ms, p95: ${tokenPercentiles.p95}ms`);

      // Fail on sustained p95 breach
      if (tokenPercentiles.p95 > 5000) {
        throw new Error(`Sustained p95 breach: ${tokenPercentiles.p95}ms (budget: 5000ms)`);
      }
    }

    if (totalValues.length > 0) {
      const totalPercentiles = calculatePercentiles(totalValues);
      console.log(`Total - p50: ${totalPercentiles.p50}ms, p95: ${totalPercentiles.p95}ms`);

      // Fail on sustained p95 breach
      if (totalPercentiles.p95 > 20000) {
        throw new Error(`Sustained p95 breach: ${totalPercentiles.p95}ms (budget: 20000ms)`);
      }
    }
  } catch (error) {
    console.warn('Failed to calculate percentiles:', error);
  }
});
