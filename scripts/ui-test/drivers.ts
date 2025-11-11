/**
 * Driver abstraction for Puppeteer vs MCP
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import type { TestEnv } from './env';

export interface Driver {
  browser: Browser | null;
  page: Page | null;
  init(): Promise<void>;
  goto(url: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * Puppeteer driver implementation
 */
export class PuppeteerDriver implements Driver {
  browser: Browser | null = null;
  page: Page | null = null;

  constructor(private env: TestEnv) {}

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: !this.env.headful,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const pages = await this.browser.pages();
    this.page = pages[0] || (await this.browser.newPage());
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async goto(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

/**
 * MCP driver implementation (placeholder - would connect via WebSocket)
 */
export class MCPDriver implements Driver {
  browser: Browser | null = null;
  page: Page | null = null;

  constructor(private env: TestEnv) {}

  async init(): Promise<void> {
    // MCP driver would connect to chrome-devtools-mcp server
    // For now, fall back to Puppeteer
    const puppeteerDriver = new PuppeteerDriver(this.env);
    await puppeteerDriver.init();
    this.browser = puppeteerDriver.browser;
    this.page = puppeteerDriver.page;
  }

  async goto(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(url, { waitUntil: 'networkidle2' });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

/**
 * Create driver based on env
 */
export function createDriver(env: TestEnv): Driver {
  if (env.mcpDriver === 'server') {
    return new MCPDriver(env);
  }
  return new PuppeteerDriver(env);
}

