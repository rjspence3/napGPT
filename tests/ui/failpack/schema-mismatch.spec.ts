/**
 * Fail Pack: Schema mismatch scenarios
 * Tests fail if response schema doesn't match expected structure
 */

import { Page } from 'puppeteer';
import { mockApiResponse } from '../../utils/network';
import { withConsoleGate } from '../../utils/consoleGate';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

describe('Fail Pack - Schema Mismatch', () => {
  let page: Page;

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  beforeEach(async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
  });

  test('should fail on missing reply field', async () => {
    await withConsoleGate(page, 'failpack-missing-reply', async (gate) => {
      // Mock response without 'reply' field
      await mockApiResponse(page, '/api/chat', { meta: { test: true } }, 200);
      
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type('Schema test');
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      
      // This should cause an error - test will fail if error handling is missing
      await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
      
      // Check that error was handled gracefully
      const message = await page.evaluate(() => {
        const msg = document.querySelector('[data-testid="message-assistant"]');
        return msg?.textContent || '';
      });
      
      // Should have some error message or fallback
      expect(message.length).toBeGreaterThan(0);
    });
  });

  test('should fail on invalid response structure', async () => {
    await withConsoleGate(page, 'failpack-invalid-structure', async (gate) => {
      // Mock invalid JSON structure
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/api/chat')) {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ invalid: 'structure', noReply: true }),
          });
        } else {
          request.continue();
        }
      });
      
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type('Invalid structure test');
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      
      // Should handle gracefully
      await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
      
      const message = await page.evaluate(() => {
        const msg = document.querySelector('[data-testid="message-assistant"]');
        return msg?.textContent || '';
      });
      
      expect(message.length).toBeGreaterThan(0);
    });
  });
});

