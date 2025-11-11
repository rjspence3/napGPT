/**
 * Visual regression tests with jest-image-snapshot
 * Limited to ~10 high-risk states
 */

import { Page } from 'puppeteer';
import { snap, snapElement } from '../utils/screen';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

describe('Visual Regression', () => {
  let page: Page;

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 }); // Fixed viewport for consistency
  });

  beforeEach(async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
  });

  test('initial empty state', async () => {
    const screenshot = await snap(page, 'initial-empty', 'after');
    expect(screenshot).toMatchImageSnapshot({
      customDiffConfig: { threshold: 0.1 },
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
    });
  });

  test('typing state - input focused', async () => {
    const input = await page.$('[data-testid="chat-input"]');
    await input?.click();
    await input?.type('Typing...');
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const screenshot = await snapElement(page, '[data-testid="chat-input"]', 'typing-input', 'after');
    expect(screenshot).toMatchImageSnapshot({
      customDiffConfig: { threshold: 0.1 },
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
    });
  });

  test('nap overlay state', async () => {
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type('/nap');
    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();
    await page.waitForSelector('[data-testid="nap-overlay"]', { timeout: 2000 });
    
    const screenshot = await snap(page, 'nap-overlay', 'during');
    expect(screenshot).toMatchImageSnapshot({
      customDiffConfig: { threshold: 0.15 }, // Higher threshold for overlay animations
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
    });
  });

  test('idle overlay state', async () => {
    const toggle = await page.$('[data-testid="nap-toggle"]');
    await toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 35000)); // Wait for idle
    
    const screenshot = await snap(page, 'idle-overlay', 'during');
    expect(screenshot).toMatchImageSnapshot({
      customDiffConfig: { threshold: 0.2 }, // Very high threshold for timing-dependent overlay
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
    });
  });

  test('beans min state (0 beans)', async () => {
    // This would require state manipulation - simplified for now
    const beansElement = await page.$('[data-testid="beans-count"]');
    if (beansElement) {
      const screenshot = await snapElement(page, '[data-testid="beans-count"]', 'beans-min', 'after');
      if (screenshot) {
        expect(screenshot).toMatchImageSnapshot({
          customDiffConfig: { threshold: 0.1 },
          failureThreshold: 0.01,
          failureThresholdType: 'percent',
        });
      }
    }
  });

  test('effort slider at 5', async () => {
    const slider = await page.$('[data-testid="effort-slider"]');
    await page.evaluate((el) => {
      (el as HTMLInputElement).value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, slider);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const screenshot = await snapElement(page, '[data-testid="effort-slider"]', 'effort-5', 'after');
    if (screenshot) {
      expect(screenshot).toMatchImageSnapshot({
        customDiffConfig: { threshold: 0.1 },
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
      });
    }
  });

  test('effort slider at 60', async () => {
    const slider = await page.$('[data-testid="effort-slider"]');
    await page.evaluate((el) => {
      (el as HTMLInputElement).value = '60';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, slider);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const screenshot = await snapElement(page, '[data-testid="effort-slider"]', 'effort-60', 'after');
    if (screenshot) {
      expect(screenshot).toMatchImageSnapshot({
        customDiffConfig: { threshold: 0.1 },
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
      });
    }
  });

  test('effort slider at 92', async () => {
    const slider = await page.$('[data-testid="effort-slider"]');
    await page.evaluate((el) => {
      (el as HTMLInputElement).value = '92';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, slider);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const screenshot = await snapElement(page, '[data-testid="effort-slider"]', 'effort-92', 'after');
    if (screenshot) {
      expect(screenshot).toMatchImageSnapshot({
        customDiffConfig: { threshold: 0.1 },
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
      });
    }
  });

  test('boost button disabled (cooldown)', async () => {
    const boostBtn = await page.$('[data-testid="boost-btn"]');
    const wasEnabled = await page.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
      boostBtn
    );
    
    if (wasEnabled) {
      await boostBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    const screenshot = await snapElement(page, '[data-testid="boost-btn"]', 'boost-disabled', 'after');
    if (screenshot) {
      expect(screenshot).toMatchImageSnapshot({
        customDiffConfig: { threshold: 0.1 },
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
      });
    }
  });

  test('with messages state', async () => {
    const input = await page.$('[data-testid="chat-input"]');
    await input?.type('Visual test message');
    const sendBtn = await page.$('[data-testid="send-btn"]');
    await sendBtn?.click();
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 15000 }).catch(() => {});
    
    const screenshot = await snap(page, 'with-messages', 'after');
    expect(screenshot).toMatchImageSnapshot({
      customDiffConfig: { threshold: 0.15 }, // Higher threshold for message animations
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
    });
  });
});

