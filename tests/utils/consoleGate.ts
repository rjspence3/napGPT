/**
 * Console error gate: fail tests on console.error or pageerror
 */

import { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

const LOGS_DIR = (global as any).LOGS_DIR || 'artifacts/ui-test/logs';

interface ConsoleLog {
  level: string;
  message: string;
  timestamp: number;
  stack?: string;
}

interface PageError {
  message: string;
  stack?: string;
  timestamp: number;
}

export class ConsoleGate {
  private page: Page;
  private consoleLogs: ConsoleLog[] = [];
  private pageErrors: PageError[] = [];
  private testName: string;

  constructor(page: Page, testName: string) {
    this.page = page;
    this.testName = testName;
  }

  /**
   * Install console and error handlers
   */
  async install(): Promise<void> {
    // Console messages
    this.page.on('console', (msg) => {
      const level = msg.type();
      const text = msg.text();
      
      this.consoleLogs.push({
        level,
        message: text,
        timestamp: Date.now(),
      });

      // Fail on console.error
      if (level === 'error') {
        console.error(`[Console Error in ${this.testName}]`, text);
      }
    });

    // Page errors
    this.page.on('pageerror', (error) => {
      this.pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
      console.error(`[Page Error in ${this.testName}]`, error.message);
    });

    // Request failures
    this.page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure) {
        this.consoleLogs.push({
          level: 'error',
          message: `Request failed: ${request.url()} - ${failure.errorText}`,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Assert no errors occurred
   */
  async assertNoErrors(): Promise<void> {
    const errors = this.consoleLogs.filter((log) => log.level === 'error');
    const hasPageErrors = this.pageErrors.length > 0;

    if (errors.length > 0 || hasPageErrors) {
      // Save logs before failing
      await this.saveLogs();

      const errorMessages: string[] = [];
      if (errors.length > 0) {
        errorMessages.push(`${errors.length} console.error(s):`);
        errors.forEach((e) => errorMessages.push(`  - ${e.message}`));
      }
      if (hasPageErrors) {
        errorMessages.push(`${this.pageErrors.length} page error(s):`);
        this.pageErrors.forEach((e) => errorMessages.push(`  - ${e.message}`));
      }

      throw new Error(`Console/Page errors detected in ${this.testName}:\n${errorMessages.join('\n')}`);
    }
  }

  /**
   * Save logs to file
   */
  async saveLogs(): Promise<void> {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    const sanitized = this.testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const logPath = path.join(LOGS_DIR, `${sanitized}.json`);

    await fs.writeFile(
      logPath,
      JSON.stringify(
        {
          testName: this.testName,
          consoleLogs: this.consoleLogs,
          pageErrors: this.pageErrors,
          timestamp: Date.now(),
        },
        null,
        2
      )
    );
  }

  /**
   * Get all logs (for debugging)
   */
  getLogs(): { console: ConsoleLog[]; errors: PageError[] } {
    return {
      console: this.consoleLogs,
      errors: this.pageErrors,
    };
  }
}

/**
 * Run test with console error gating
 */
export async function withConsoleGate<T>(
  page: Page,
  testName: string,
  fn: (gate: ConsoleGate) => Promise<T>
): Promise<T> {
  const gate = new ConsoleGate(page, testName);
  await gate.install();

  try {
    const result = await fn(gate);
    await gate.assertNoErrors();
    return result;
  } catch (error) {
    await gate.saveLogs();
    throw error;
  }
}

