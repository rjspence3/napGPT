/**
 * Accessibility tests with axe-core
 * Asserts zero P0 (critical/serious) violations on key screens
 */

import { Page } from 'puppeteer';
import { runAxe, assertNoP0Violations, getP0Violations } from '../utils/a11y';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

// P0 elements that must be accessible
const P0_SELECTORS = [
  '[data-testid="chat-input"]',
  '[data-testid="send-btn"]',
  '[data-testid="effort-slider"]',
  '[data-testid="boost-btn"]',
  '[data-testid="nap-toggle"]',
];

describe('Accessibility (A11y)', () => {
  let page: Page;

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  test('should have zero P0 violations on initial page', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
    
    const results = await runAxe(page);
    assertNoP0Violations(results);
  });

  test('should have zero P0 violations on P0 elements', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
    
    const results = await runAxe(page);
    const p0Violations = getP0Violations(results, P0_SELECTORS);
    
    expect(p0Violations.length).toBe(0);
  });

  test('should have zero P0 violations with messages', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
    
    // Send a message
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type('A11y test');
    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();
    
    // Wait for response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 15000 }).catch(() => {});
    
    const results = await runAxe(page);
    assertNoP0Violations(results);
  });

  test('should have zero P0 violations with nap overlay', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
    
    // Trigger nap overlay
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type('/nap');
    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();
    
    await page.waitForSelector('[data-testid="nap-overlay"]', { timeout: 2000 });
    
    const results = await runAxe(page);
    assertNoP0Violations(results);
  });
});

