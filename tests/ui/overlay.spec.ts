/**
 * Overlay tests: nap, idle, with before/during/after screenshots
 */

import { Page } from 'puppeteer';
import { withScreenshots } from '../utils/screen';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

describe('Overlay States', () => {
  let page: Page;

  // Extend timeout for overlay tests with animations and waits
  jest.setTimeout(60000);

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  beforeEach(async () => {
    // Navigate first, then clear localStorage (can't access storage on about:blank)
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    // Reload to apply cleared state
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
  });

  test('should show nap overlay with before/during/after screenshots', async () => {
    await withScreenshots({
      page,
      testName: 'nap-overlay',
      action: async () => {
        const input = await page.$('[data-testid="chat-input"]');
        await input?.type('/nap');
        const sendBtn = await page.$('[data-testid="send-btn"]');
        await sendBtn?.click();
        
        // Wait for nap overlay
        await page.waitForSelector('[data-testid="nap-overlay"]', { timeout: 2000 });
      },
      waitDuring: 500,
      waitAfter: 2000,
    });
    
    // Verify overlay exists
    const napOverlay = await page.$('[data-testid="nap-overlay"]');
    expect(napOverlay).not.toBeNull();
    
    // Verify input is disabled during nap
    const inputDisabled = await page.evaluate(
      () => (document.querySelector('[data-testid="chat-input"]') as HTMLInputElement)?.disabled
    );
    expect(inputDisabled).toBe(true);
  });

  test('should show idle overlay when nap timer enabled', async () => {
    // Enable nap timer via UI
    const toggle = await page.$('[data-testid="nap-toggle"]');
    await toggle?.click();
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Directly manipulate store state: set idleSince to 31s ago and trigger update
    await page.evaluate(() => {
      const store = (window as any).__nap_store;
      if (store) {
        store.setState({ idleSince: Date.now() - 31000 });
        store.getState().updateIdle?.();
      }
    });

    // Wait for idle overlay to appear
    await page.waitForSelector('[data-testid="idle-overlay"]', { timeout: 3000 });

    const idleOverlay = await page.$('[data-testid="idle-overlay"]');
    expect(idleOverlay).not.toBeNull();

    const isVisible = await page.evaluate((el) => {
      const style = window.getComputedStyle(el!);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }, idleOverlay);
    expect(isVisible).toBe(true);
  });

  test('should handle boost cooldown state', async () => {
    // Verify beans available (initial = 3 after localStorage clear)
    const beans = await page.evaluate(() =>
      (window as any).__nap_store?.getState()?.beans ?? 0
    );
    expect(beans).toBeGreaterThan(0);

    await withScreenshots({
      page,
      testName: 'boost-cooldown',
      action: async () => {
        const boostBtn = await page.$('[data-testid="boost-btn"]');
        expect(boostBtn).not.toBeNull();

        const wasEnabled = await page.evaluate(
          (el) => !(el as HTMLButtonElement).disabled,
          boostBtn
        );
        expect(wasEnabled).toBe(true);

        await boostBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Verify button is now disabled (cooldown)
        const isDisabled = await page.evaluate(
          (el) => (el as HTMLButtonElement).disabled,
          boostBtn
        );
        expect(isDisabled).toBe(true);
      },
      waitDuring: 500,
      waitAfter: 1000,
    });
  });
});

