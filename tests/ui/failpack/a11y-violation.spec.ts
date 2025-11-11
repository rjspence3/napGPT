/**
 * Fail Pack: Accessibility violation scenarios
 * Tests fail if axe-core finds violations
 */

import { Page } from 'puppeteer';
import { runAxe, assertNoP0Violations } from '../../utils/a11y';
import { withConsoleGate } from '../../utils/consoleGate';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

describe('Fail Pack - A11y Violations', () => {
  let page: Page;

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  beforeEach(async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
  });

  test('should fail on unlabeled control (if test flag enabled)', async () => {
    await withConsoleGate(page, 'failpack-a11y-unlabeled', async (gate) => {
      // Inject an unlabeled button (simulating a regression)
      // This would normally be behind a test flag: NEXT_PUBLIC_NAPGPT_TEST_A11Y_VIOLATION=1
      if (process.env.NEXT_PUBLIC_NAPGPT_TEST_A11Y_VIOLATION === '1') {
        await page.evaluate(() => {
          const btn = document.createElement('button');
          btn.textContent = 'Unlabeled Button';
          // Missing aria-label
          document.body.appendChild(btn);
        });
      }
      
      const results = await runAxe(page);
      
      // This test will FAIL if violations are found
      // It PASSES if no violations (normal case)
      assertNoP0Violations(results);
    });
  });
});

