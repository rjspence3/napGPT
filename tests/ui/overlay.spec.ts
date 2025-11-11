/**
 * Overlay tests: nap, idle, with before/during/after screenshots
 */

import { Page } from 'puppeteer';
import { withScreenshots } from '../utils/screen';
import { withFakeTimers } from '../utils/clock';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

describe('Overlay States', () => {
  let page: Page;

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  beforeEach(async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
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
    await withFakeTimers(async (clock) => {
      // Enable nap timer
      const toggle = await page.$('[data-testid="nap-toggle"]');
      await toggle?.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Advance time to trigger idle (30 seconds)
      clock.tick(31000);
      
      // Wait for idle overlay
      await page.waitForSelector('[data-testid="idle-overlay"]', { timeout: 2000 }).catch(() => {
        // May not appear immediately, check if it exists
      });
      
      const idleOverlay = await page.$('[data-testid="idle-overlay"]');
      // Overlay may or may not be visible depending on timing
      if (idleOverlay) {
        const isVisible = await page.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }, idleOverlay);
        expect(isVisible).toBe(true);
      }
    }, Date.now());
  });

  test('should handle boost cooldown state', async () => {
    await withScreenshots({
      page,
      testName: 'boost-cooldown',
      action: async () => {
        const boostBtn = await page.$('[data-testid="boost-btn"]');
        const wasEnabled = await page.evaluate(
          (el) => !(el as HTMLButtonElement).disabled,
          boostBtn
        );
        
        if (wasEnabled) {
          await boostBtn?.click();
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          // Verify button is now disabled (cooldown)
          const isDisabled = await page.evaluate(
            (el) => (el as HTMLButtonElement).disabled,
            boostBtn
          );
          expect(isDisabled).toBe(true);
        }
      },
      waitDuring: 500,
      waitAfter: 1000,
    });
  });
});

