/**
 * Screenshot helpers: before/during/after pattern and focused crops
 */

import { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

const SCREENS_DIR = (global as any).SCREENS_DIR || 'artifacts/ui-test/screens';

interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
}

/**
 * Take screenshot with consistent naming
 */
export async function snap(
  page: Page,
  testName: string,
  step: 'before' | 'during' | 'after' | 'before-send' | 'during-stream' | 'after-reply',
  options: ScreenshotOptions = {}
): Promise<string> {
  await fs.mkdir(SCREENS_DIR, { recursive: true });
  const sanitized = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `${sanitized}-${step}.png`;
  const filepath = path.join(SCREENS_DIR, filename);
  
  await page.screenshot({
    path: filepath,
    fullPage: options.fullPage ?? false,
    clip: options.clip,
  });
  
  return filepath;
}

/**
 * Crop screenshot to element bounds
 */
export async function snapElement(
  page: Page,
  selector: string,
  testName: string,
  step: 'before' | 'during' | 'after'
): Promise<string | null> {
  const element = await page.$(selector);
  if (!element) return null;
  
  const box = await element.boundingBox();
  if (!box) return null;
  
  return snap(page, `${testName}-${selector.replace(/[^a-z0-9]/gi, '-')}`, step, {
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    },
  });
}

/**
 * Run action with before/during/after screenshots
 */
export async function withScreenshots<T>(options: {
  page: Page;
  testName: string;
  action: () => Promise<T>;
  waitDuring?: number;
  waitAfter?: number;
  beforeLabel?: string;
  duringLabel?: string;
  afterLabel?: string;
}): Promise<T> {
  const {
    page,
    testName,
    action,
    waitDuring = 500,
    waitAfter = 500,
    beforeLabel = 'before',
    duringLabel = 'during',
    afterLabel = 'after',
  } = options;

  // Before
  await snap(page, testName, 'before');
  
  // During
  const actionPromise = action();
  await new Promise((resolve) => setTimeout(resolve, waitDuring));
  await snap(page, testName, 'during');
  
  // Wait for action to complete
  const result = await actionPromise;
  
  // After
  await new Promise((resolve) => setTimeout(resolve, waitAfter));
  await snap(page, testName, 'after');
  
  return result;
}

/**
 * Capture chat exchange: input field and latest assistant message
 */
export async function snapChatExchange(page: Page, testName: string): Promise<void> {
  // Crop input field
  await snapElement(page, '[data-testid="chat-input"]', testName, 'after');
  
  // Crop latest assistant message
  await snapElement(page, '[data-testid="message-assistant"]:last-of-type', testName, 'after');
}

