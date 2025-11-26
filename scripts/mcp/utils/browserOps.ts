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
  waitForFunction<T>(fn: () => T | Promise<T>, options?: { timeout?: number; polling?: number }): Promise<T>;
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

      // For React controlled inputs, we need to set the value and trigger React events
      // Use React's native event system to ensure state updates
      await page.evaluate((sel, txt) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el) {
          // Get the native input value setter
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;

          // Clear first
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, '');
          } else {
            el.value = '';
          }

          // Trigger React's onChange by dispatching input event
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          el.dispatchEvent(inputEvent);

          // Now set the new value
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, txt);
          } else {
            el.value = txt;
          }

          // Trigger React's onChange event
          const changeEvent = new Event('input', { bubbles: true, cancelable: true });
          el.dispatchEvent(changeEvent);
        }
      }, selector, text);

      // Also use Puppeteer's type for visual feedback and additional event triggers
      // Clear first
      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el) {
          el.focus();
          el.select();
        }
      }, selector);

      await page.keyboard.type(text, { delay: options?.delay || 50 });

      // Wait for React to process the state update
      await page.waitForFunction(
        (sel, expectedText) => {
          const el = document.querySelector(sel) as HTMLInputElement;
          return el && el.value === expectedText;
        },
        { timeout: 5000 },
        selector,
        text
      );

      // Additional small delay to ensure React state has updated
      await new Promise((resolve) => setTimeout(resolve, 200));
    },

    async setSlider(selector: string, value: number) {
      await page.waitForSelector(selector);
      // Use CDP to set value and trigger events
      await page.evaluate(
        (sel, val) => {
          const el = document.querySelector(sel) as HTMLInputElement;
          if (el) {
            // Get the native input value setter for React compatibility
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;

            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(el, String(val));
            } else {
              el.value = String(val);
            }

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
            // Use evaluate to get the last element's text with multiple extraction strategies
            text = await page.evaluate((sel) => {
              const elements = document.querySelectorAll(sel);
              if (elements.length === 0) return "";
              const lastEl = elements[elements.length - 1];

              // Strategy 1: Try nested <p> tag (most common for messages)
              const pTag = lastEl.querySelector('p');
              if (pTag) {
                const pText = pTag.textContent || (pTag as HTMLElement).innerText || "";
                if (pText.trim()) {
                  return pText.trim();
                }
              }

              // Strategy 2: Try all <p> tags in element
              const allPTags = lastEl.querySelectorAll('p');
              if (allPTags.length > 0) {
                const texts: string[] = [];
                allPTags.forEach((p) => {
                  const txt = p.textContent || (p as HTMLElement).innerText || "";
                  if (txt.trim()) texts.push(txt.trim());
                });
                if (texts.length > 0) {
                  return texts.join(' ').trim();
                }
              }

              // Strategy 3: TreeWalker for all text nodes recursively
              const walker = document.createTreeWalker(
                lastEl,
                NodeFilter.SHOW_TEXT,
                null
              );
              let node;
              const textParts: string[] = [];
              while ((node = walker.nextNode())) {
                if (node.textContent && node.textContent.trim()) {
                  textParts.push(node.textContent.trim());
                }
              }
              if (textParts.length > 0) {
                return textParts.join(' ').trim();
              }

              // Strategy 4: Get text from all children
              const children = Array.from(lastEl.children);
              const childTexts: string[] = [];
              children.forEach((child) => {
                const txt = child.textContent || (child as HTMLElement).innerText || "";
                if (txt.trim()) childTexts.push(txt.trim());
              });
              if (childTexts.length > 0) {
                return childTexts.join(' ').trim();
              }

              // Strategy 5: Fallback to element's own text
              return lastEl.textContent || (lastEl as HTMLElement).innerText || "";
            }, baseSelector);
          } else {
            // Try standard approach with multiple strategies
            const element = await page.$(selector);
            if (element) {
              text = await page.evaluate((el) => {
                // Strategy 1: For message elements, try nested <p> tag first
                if (el.getAttribute('data-testid') === 'message-assistant' || el.getAttribute('data-testid') === 'message-user') {
                  const pTag = el.querySelector('p');
                  if (pTag) {
                    const pText = pTag.textContent || (pTag as HTMLElement).innerText || "";
                    if (pText.trim()) {
                      return pText.trim();
                    }
                  }

                  // Try all <p> tags
                  const allPTags = el.querySelectorAll('p');
                  if (allPTags.length > 0) {
                    const texts: string[] = [];
                    allPTags.forEach((p) => {
                      const txt = p.textContent || (p as HTMLElement).innerText || "";
                      if (txt.trim()) texts.push(txt.trim());
                    });
                    if (texts.length > 0) {
                      return texts.join(' ').trim();
                    }
                  }
                }

                // Strategy 2: TreeWalker
                const walker = document.createTreeWalker(
                  el,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                let node;
                const textParts: string[] = [];
                while ((node = walker.nextNode())) {
                  if (node.textContent && node.textContent.trim()) {
                    textParts.push(node.textContent.trim());
                  }
                }
                if (textParts.length > 0) {
                  return textParts.join(' ').trim();
                }

                // Strategy 3: Fallback to element's own text
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
          // Wait longer between retries for message content to populate
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      log(`[BrowserOps] ✗ Failed to get text after ${retries} attempts`);
      // Final debug check
      try {
        const debugInfo = await page.evaluate((sel) => {
          const baseSel = sel.includes(':last-of-type') ? sel.split(':last-of-type')[0] : sel;
          const elements = document.querySelectorAll(baseSel);
          return {
            count: elements.length,
            texts: Array.from(elements).map((el, idx) => {
              // Try nested <p> tag first for message-assistant
              const pTag = el.querySelector('p');
              const text = pTag && pTag.textContent
                ? pTag.textContent
                : (el.textContent || (el as HTMLElement).innerText || "");
              return {
                index: idx,
                text: text.substring(0, 100),
                hasPTag: !!pTag,
                pTagText: pTag ? (pTag.textContent || "").substring(0, 50) : "",
              };
            }),
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
        // Skip standard waitForSelector for :last-of-type as Puppeteer struggles with it
        if (selector.includes(':last-of-type')) {
          throw new Error("Skip to fallback for pseudo-selector");
        }

        // First try standard wait
        await page.waitForSelector(selector, { timeout, visible: true });
        const elapsed = Date.now() - startTime;
        log(`[BrowserOps] ✓ Found selector ${selector} after ${elapsed}ms`);
      } catch (error) {
        // Fallback strategies for message-assistant selectors
        if (selector.includes('message-assistant')) {
          log(`[BrowserOps] Primary selector failed, trying fallback strategies...`);

          // Strategy 1: Try any message-assistant element
          try {
            const remainingTimeout = Math.max(1000, timeout - (Date.now() - startTime));
            await page.waitForSelector('[data-testid="message-assistant"]', {
              timeout: Math.min(remainingTimeout, 5000),
              visible: true
            });
            const elapsed = Date.now() - startTime;
            log(`[BrowserOps] ✓ Found via fallback selector after ${elapsed}ms`);
            return;
          } catch { }

          // Strategy 2: Wait for any message in the list using waitForFunction
          try {
            const remainingTimeout = Math.max(1000, timeout - (Date.now() - startTime));
            await page.waitForFunction(
              () => {
                const messages = document.querySelectorAll('[data-testid="message-assistant"]');
                return messages.length > 0;
              },
              { timeout: Math.min(remainingTimeout, 5000) }
            );
            const elapsed = Date.now() - startTime;
            log(`[BrowserOps] ✓ Found via waitForFunction after ${elapsed}ms`);
            return;
          } catch { }

          // Strategy 3: Wait for message to have actual text content (not just exist)
          try {
            const remainingTimeout = Math.max(1000, timeout - (Date.now() - startTime));
            const waitTimeout = Math.min(remainingTimeout, 30000); // Up to 30s for content

            await page.waitForFunction(
              (sel) => {
                // Handle :last-of-type selector
                const baseSel = sel.includes(':last-of-type') ? sel.split(':last-of-type')[0] : sel;
                const elements = document.querySelectorAll(baseSel);
                if (elements.length === 0) return false;

                const targetEl = sel.includes(':last-of-type')
                  ? elements[elements.length - 1]
                  : elements[0];

                // Try nested <p> tag first
                const pTag = targetEl.querySelector('p');
                if (pTag) {
                  const text = pTag.textContent || (pTag as HTMLElement).innerText || "";
                  if (text.trim().length > 0) return true;
                }

                // Try all <p> tags
                const allPTags = targetEl.querySelectorAll('p');
                for (let i = 0; i < allPTags.length; i++) {
                  const txt = allPTags[i].textContent || (allPTags[i] as HTMLElement).innerText || "";
                  if (txt.trim().length > 0) return true;
                }

                // Try TreeWalker for all text nodes
                const walker = document.createTreeWalker(
                  targetEl,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                let node;
                while ((node = walker.nextNode())) {
                  if (node.textContent && node.textContent.trim().length > 0) {
                    return true;
                  }
                }

                // Fallback: check element's own text
                const text = targetEl.textContent || (targetEl as HTMLElement).innerText || "";
                return text.trim().length > 0;
              },
              { timeout: waitTimeout },
              selector
            );
            const elapsed = Date.now() - startTime;
            log(`[BrowserOps] ✓ Found message with content after ${elapsed}ms`);
            return;
          } catch { }

          // Strategy 4: Check if message list has any children (last resort)
          try {
            const remainingTimeout = Math.max(1000, timeout - (Date.now() - startTime));
            await page.waitForFunction(
              () => {
                const list = document.querySelector('[data-testid="message-list"]');
                return list && list.children.length > 0;
              },
              { timeout: Math.min(remainingTimeout, 3000) }
            );
            const elapsed = Date.now() - startTime;
            log(`[BrowserOps] ✓ Found via message list check after ${elapsed}ms`);
            return;
          } catch { }
        }

        // If all fallbacks fail, throw original error
        const elapsed = Date.now() - startTime;
        log(`[BrowserOps] ✗ Failed to find selector ${selector} after ${elapsed}ms (all strategies exhausted)`);
        throw error;
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

    async waitForFunction<T, A extends any[]>(
      fn: (...args: A) => T | Promise<T>,
      options?: { timeout?: number; polling?: number },
      ...args: A
    ): Promise<T> {
      const timeout = options?.timeout || 5000;
      const polling = options?.polling || 100;
      const startTime = Date.now();

      log(`[BrowserOps] Waiting for function condition (timeout: ${timeout}ms)...`);

      while (Date.now() - startTime < timeout) {
        try {
          const result = await page.evaluate(fn as any, ...args);
          if (result) {
            const elapsed = Date.now() - startTime;
            log(`[BrowserOps] ✓ Function condition met after ${elapsed}ms`);
            return result as T;
          }
        } catch (e) {
          // Ignore evaluation errors, continue polling
        }
        await new Promise((resolve) => setTimeout(resolve, polling));
      }

      throw new Error(`Function condition not met within ${timeout}ms`);
    },

    async evaluate<T>(fn: () => T): Promise<T> {
      try {
        return await page.evaluate(fn);
      } catch (error: any) {
        // Check if error is due to detached frame
        if (error.message && (
          error.message.includes('detached') ||
          error.message.includes('Frame') ||
          error.message.includes('Execution context was destroyed')
        )) {
          log(`[BrowserOps] Frame detached error: ${error.message}`);
          throw new Error(`Frame detached - test isolation issue: ${error.message}`);
        }
        throw error;
      }
    },

    async evaluateWithArgs<T, A extends any[]>(fn: (...args: A) => T, ...args: A): Promise<T> {
      try {
        return await page.evaluate(fn as any, ...args);
      } catch (error: any) {
        // Check if error is due to detached frame
        if (error.message && (
          error.message.includes('detached') ||
          error.message.includes('Frame') ||
          error.message.includes('Execution context was destroyed')
        )) {
          log(`[BrowserOps] Frame detached error: ${error.message}`);
          throw new Error(`Frame detached - test isolation issue: ${error.message}`);
        }
        throw error;
      }
    },
  };
}

