/**
 * Browser operations using CDP
 */

import type { Page, CDPSession } from "puppeteer";

export interface BrowserOps {
  click(selector: string, options?: { waitFor?: number }): Promise<void>;
  type(selector: string, text: string, options?: { delay?: number }): Promise<void>;
  setSlider(selector: string, value: number): Promise<void>;
  getText(selector: string, retries?: number): Promise<string>;
  getAttribute(selector: string, attr: string): Promise<string | null>;
  isVisible(selector: string): Promise<boolean>;
  isDisabled(selector: string): Promise<boolean>;
  waitFor(selector: string, timeout?: number): Promise<void>;
  waitForNetworkIdle(timeout?: number): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  evaluateWithArgs<T, A extends any[]>(fn: (...args: A) => T, ...args: A): Promise<T>;
}

// Force unbuffered console output
const log = (...args: any[]) => {
  console.log(...args);
  // Force flush
  if (process.stdout.isTTY) {
    process.stdout.write('');
  }
};

export function createBrowserOps(page: Page, cdp: CDPSession): BrowserOps {
  return {
    async click(selector: string, options?: { waitFor?: number }) {
      await page.waitForSelector(selector, { visible: true });
      await page.click(selector);
      if (options?.waitFor) {
        await new Promise((resolve) => setTimeout(resolve, options.waitFor));
      }
    },

    async type(selector: string, text: string, options?: { delay?: number }) {
      await page.waitForSelector(selector, { visible: true });
      await page.focus(selector);
      await page.type(selector, text, { delay: options?.delay || 50 });
    },

    async setSlider(selector: string, value: number) {
      await page.waitForSelector(selector);
      // Use CDP to set value and trigger events
      await page.evaluate(
        (sel, val) => {
          const el = document.querySelector(sel) as HTMLInputElement;
          if (el) {
            el.value = String(val);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        },
        selector,
        value
      );
      // Wait for React to update
      await new Promise((resolve) => setTimeout(resolve, 300));
    },

    async getText(selector: string, retries: number = 5): Promise<string> {
      log(`[BrowserOps] Getting text from ${selector} (retries: ${retries})...`);
      
      // Handle :last-of-type selector specially since page.$() doesn't work with it
      const isLastOfType = selector.includes(':last-of-type');
      const baseSelector = isLastOfType ? selector.split(':last-of-type')[0] : selector;
      
      for (let i = 0; i < retries; i++) {
        try {
          let text = "";
          
          if (isLastOfType) {
            // Use evaluate to get the last element's text
            text = await page.evaluate((sel) => {
              const elements = document.querySelectorAll(sel);
              if (elements.length === 0) return "";
              const lastEl = elements[elements.length - 1];
              return lastEl.textContent || (lastEl as HTMLElement).innerText || "";
            }, baseSelector);
          } else {
            // Try standard approach
            const element = await page.$(selector);
            if (element) {
              text = await page.evaluate((el) => {
                return el.textContent || (el as HTMLElement).innerText || "";
              }, element);
            }
          }
          
          if (text.trim()) {
            log(`[BrowserOps] ✓ Got text (attempt ${i + 1}): "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}" (length: ${text.length})`);
            return text.trim();
          } else {
            log(`[BrowserOps] Text empty (attempt ${i + 1}), length: ${text.length}`);
          }
        } catch (e: any) {
          log(`[BrowserOps] Error getting text (attempt ${i + 1}): ${e.message}`);
        }
        
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      
      log(`[BrowserOps] ✗ Failed to get text after ${retries} attempts`);
      // Final debug check
      try {
        const debugInfo = await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel.includes(':last-of-type') ? sel.split(':last-of-type')[0] : sel);
          return {
            count: elements.length,
            texts: Array.from(elements).map((el, idx) => ({
              index: idx,
              text: (el.textContent || (el as HTMLElement).innerText || "").substring(0, 100),
            })),
          };
        }, selector);
        log(`[BrowserOps] Debug: Found ${debugInfo.count} elements matching base selector:`, JSON.stringify(debugInfo.texts, null, 2));
      } catch (debugError) {
        log(`[BrowserOps] Debug check failed: ${debugError}`);
      }
      
      return "";
    },

    async getAttribute(selector: string, attr: string): Promise<string | null> {
      await page.waitForSelector(selector);
      return page.evaluate(
        (sel, a) => {
          const el = document.querySelector(sel);
          return el ? el.getAttribute(a) : null;
        },
        selector,
        attr
      );
    },

    async isVisible(selector: string): Promise<boolean> {
      try {
        const element = await page.$(selector);
        if (!element) return false;
        return await page.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
        }, element);
      } catch {
        return false;
      }
    },

    async isDisabled(selector: string): Promise<boolean> {
      try {
        await page.waitForSelector(selector);
        return await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLElement;
          return el ? (el as any).disabled || el.getAttribute("aria-disabled") === "true" : false;
        }, selector);
      } catch {
        return false;
      }
    },

    async waitFor(selector: string, timeout: number = 5000) {
      const startTime = Date.now();
      log(`[BrowserOps] Waiting for selector: ${selector} (timeout: ${timeout}ms)`);
      try {
        // First try standard wait
        await page.waitForSelector(selector, { timeout, visible: true });
        const elapsed = Date.now() - startTime;
        log(`[BrowserOps] ✓ Found selector ${selector} after ${elapsed}ms`);
      } catch (error) {
        // Fallback: wait for any message-assistant element
        if (selector.includes('message-assistant')) {
          log(`[BrowserOps] Primary selector failed, trying fallback...`);
          try {
            await page.waitForSelector('[data-testid="message-assistant"]', { timeout: Math.min(timeout, 2000) });
            const elapsed = Date.now() - startTime;
            log(`[BrowserOps] ✓ Found fallback selector after ${elapsed}ms`);
          } catch {
            log(`[BrowserOps] Fallback selector failed, trying waitForFunction...`);
            // Last resort: wait for message list to have children
            await page.waitForFunction(
              () => document.querySelectorAll('[data-testid="message-assistant"]').length > 0,
              { timeout }
            );
            const elapsed = Date.now() - startTime;
            log(`[BrowserOps] ✓ Found via waitForFunction after ${elapsed}ms`);
          }
        } else {
          const elapsed = Date.now() - startTime;
          log(`[BrowserOps] ✗ Failed to find selector ${selector} after ${elapsed}ms`);
          throw error;
        }
      }
    },

    async waitForNetworkIdle(timeout: number = 5000) {
      const waitTime = Math.min(timeout, 1000);
      log(`[BrowserOps] Waiting for network idle (${waitTime}ms)...`);
      // Simple wait for React to settle and network to be idle
      // Just wait a fixed amount since we can't easily track network activity
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      log(`[BrowserOps] ✓ Network idle wait complete`);
    },

    async evaluate<T>(fn: () => T): Promise<T> {
      return page.evaluate(fn);
    },

    async evaluateWithArgs<T, A extends any[]>(fn: (...args: A) => T, ...args: A): Promise<T> {
      return page.evaluate(fn as any, ...args);
    },
  };
}

