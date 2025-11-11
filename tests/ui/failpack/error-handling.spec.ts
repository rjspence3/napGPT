/**
 * Fail Pack: Error handling scenarios
 * These tests intentionally fail to prove the test system catches real issues
 */

import { Page } from 'puppeteer';
import { mockApiResponse } from '../../utils/network';
import { withConsoleGate } from '../../utils/consoleGate';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

describe('Fail Pack - Error Handling', () => {
  let page: Page;

  beforeAll(async () => {
    page = (global as any).page;
    await page.setViewport({ width: 1280, height: 720 });
  });

  beforeEach(async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });
  });

  test('should fail on 429 rate limit error', async () => {
    await withConsoleGate(page, 'failpack-429', async (gate) => {
      // Mock 429 response
      await mockApiResponse(page, '/api/chat', { error: 'Rate limit exceeded' }, 429);
      
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type('Rate limit test');
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      
      // Wait for error message
      await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
      
      const errorMessage = await page.evaluate(() => {
        const msg = document.querySelector('[data-testid="message-assistant"]');
        return msg?.textContent || '';
      });
      
      // This test should PASS if error UX is implemented
      // It will FAIL if error handling is missing
      expect(errorMessage.toLowerCase()).toMatch(/rate limit|error|exceeded/);
    });
  });

  test('should fail on 500 server error', async () => {
    await withConsoleGate(page, 'failpack-500', async (gate) => {
      // Mock 500 response
      await mockApiResponse(page, '/api/chat', { error: 'Internal server error' }, 500);
      
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type('Server error test');
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      
      // Wait for error message
      await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
      
      const errorMessage = await page.evaluate(() => {
        const msg = document.querySelector('[data-testid="message-assistant"]');
        return msg?.textContent || '';
      });
      
      // This test should PASS if error UX is implemented
      expect(errorMessage.toLowerCase()).toMatch(/error|broke|failed/);
    });
  });

  test('should fail on timeout', async () => {
    await withConsoleGate(page, 'failpack-timeout', async (gate) => {
      // Mock timeout by not responding
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/api/chat')) {
          // Don't respond - simulate timeout
          return;
        }
        request.continue();
      });
      
      const input = await page.$('[data-testid="chat-input"]');
      await input?.type('Timeout test');
      const sendBtn = await page.$('[data-testid="send-btn"]');
      await sendBtn?.click();
      
      // Wait for timeout error
      await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 35000 });
      
      const errorMessage = await page.evaluate(() => {
        const msg = document.querySelector('[data-testid="message-assistant"]');
        return msg?.textContent || '';
      });
      
      // This test should PASS if timeout UX is implemented
      expect(errorMessage.toLowerCase()).toMatch(/timeout|took too long|error/);
    });
  });
});

