/**
 * Fail Pack: Visual drift scenarios
 * Tests fail if visual snapshots don't match
 */

import { Page } from 'puppeteer';
import { snap } from '../../utils/screen';
import { withConsoleGate } from '../../utils/consoleGate';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

describe('Fail Pack - Visual Drift', () => {
  let page: Page;

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  beforeEach(async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
  });

  test('should fail on visual drift (if test flag enabled)', async () => {
    await withConsoleGate(page, 'failpack-visual-drift', async (gate) => {
      // Inject CSS shift (simulating a regression)
      // This would normally be behind a test flag: NEXT_PUBLIC_NAPGPT_TEST_VISUAL_DRIFT=1
      if (process.env.NEXT_PUBLIC_NAPGPT_TEST_VISUAL_DRIFT === '1') {
        await page.addStyleTag({
          content: `
            [data-testid="chat-input"] {
              transform: translateX(2px) !important;
            }
          `,
        });
      }
      
      const screenshot = await snap(page, 'failpack-visual-drift', 'after');
      
      // This test will FAIL if visual drift is detected
      // It PASSES if no drift (normal case)
      expect(screenshot).toMatchImageSnapshot({
        customDiffConfig: { threshold: 0.1 },
        failureThreshold: 0.01,
        failureThresholdType: 'percent',
      });
    });
  });
});

