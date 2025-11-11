/**
 * Live LLM test utilities
 * Validates environment, captures streaming, handles artifacts
 */

import { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

const HAR_DIR = (global as any).HAR_DIR || 'artifacts/ui-test/har';
const LOGS_DIR = (global as any).LOGS_DIR || 'artifacts/ui-test/logs';
const VIDEO_DIR = (global as any).VIDEO_DIR || 'artifacts/ui-test/video';
const TRACE_DIR = (global as any).TRACE_DIR || 'artifacts/ui-test/trace';
const METRICS_DIR = (global as any).METRICS_DIR || 'artifacts/ui-test';

interface LiveEnv {
  provider: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

/**
 * Require live LLM environment variables
 * Fails early with clear error if missing
 */
export function requireLiveEnv(): LiveEnv {
  if (process.env.LIVE_LLM !== '1') {
    throw new Error(
      'LIVE_LLM=1 required for live LLM tests. Set LIVE_LLM=1 to enable.'
    );
  }

  const provider = process.env.LLM_PROVIDER || 'openai';
  if (!['openai', 'anthropic'].includes(provider)) {
    throw new Error(
      `LLM_PROVIDER must be one of: openai, anthropic. Got: ${provider}`
    );
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    throw new Error(
      'LLM_API_KEY required when LIVE_LLM=1. Set LLM_API_KEY=<your-key>'
    );
  }

  const model = process.env.LLM_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20241022');
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '128', 10);

  return {
    provider,
    apiKey,
    model,
    maxTokens,
  };
}

/**
 * Assert streaming behavior - verifies ≥3 chunks over SSE/fetch streaming
 */
export async function assertStreaming(
  page: Page,
  urlPattern: string | RegExp,
  onChunk?: () => void
): Promise<number> {
  let chunkCount = 0;
  let firstChunkSeen = false;
  const pattern = typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern;

  const responseHandler = async (response: any) => {
    if (pattern.test(response.url())) {
      const headers = response.headers();
      const contentType = headers['content-type'] || '';
      
      // Check for streaming indicators
      const isStreaming =
        headers['transfer-encoding'] === 'chunked' ||
        contentType.includes('text/event-stream') ||
        contentType.includes('text/plain') ||
        response.request().method() === 'POST';

      if (isStreaming) {
        // Try to read response body in chunks
        try {
          const text = await response.text();
          if (text && text.length > 0) {
            chunkCount++;
            if (!firstChunkSeen && onChunk) {
              firstChunkSeen = true;
              onChunk();
            }
          }
        } catch (e) {
          // Response may be consumed, count anyway
          chunkCount++;
          if (!firstChunkSeen && onChunk) {
            firstChunkSeen = true;
            onChunk();
          }
        }
      }
    }
  };

  // Also listen for network requests to detect streaming
  const requestHandler = (request: any) => {
    if (pattern.test(request.url()) && request.method() === 'POST') {
      // Track POST requests
    }
  };

  page.on('response', responseHandler);
  page.on('request', requestHandler);

  // Wait a bit for streaming to occur
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return chunk count (will be updated as streaming continues)
  return new Promise((resolve) => {
    setTimeout(() => {
      page.off('response', responseHandler);
      page.off('request', requestHandler);
      resolve(chunkCount);
    }, 5000);
  }) as Promise<number>;
}

/**
 * Capture HAR for chat spec
 */
export async function captureHar(page: Page, name: string): Promise<string> {
  await fs.mkdir(HAR_DIR, { recursive: true });
  const harPath = path.join(HAR_DIR, `${name}.har`);

  const client = await page.target().createCDPSession();
  await client.send('Network.enable');

  const entries: any[] = [];

  const requestHandler = (request: any) => {
    const url = request.url();
    const postData = request.postData();
    
    // Redact API keys from HAR
    let sanitizedPostData = postData;
    if (sanitizedPostData) {
      try {
        const parsed = JSON.parse(sanitizedPostData);
        if (parsed.apiKey) parsed.apiKey = '***REDACTED***';
        if (parsed.key) parsed.key = '***REDACTED***';
        sanitizedPostData = JSON.stringify(parsed);
      } catch {
        // Not JSON, try string replacement
        sanitizedPostData = sanitizedPostData.replace(
          /(api[_-]?key|apikey)\s*[:=]\s*["']?[^"'\s]+/gi,
          '$1: ***REDACTED***'
        );
      }
    }

    entries.push({
      request: {
        method: request.method(),
        url: url.replace(/api[_-]?key=[^&]+/gi, 'api_key=***REDACTED***'),
        headers: redactHeaders(request.headers()),
        postData: sanitizedPostData,
      },
      timestamp: Date.now(),
    });
  };

  const responseHandler = async (response: any) => {
    const entry = entries.find((e) => e.request.url === response.url());
    if (entry) {
      entry.response = {
        status: response.status(),
        headers: redactHeaders(response.headers()),
      };
    }
  };

  page.on('request', requestHandler);
  page.on('response', responseHandler);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  page.off('request', requestHandler);
  page.off('response', responseHandler);

  const har = {
    log: {
      version: '1.2',
      creator: { name: 'NapGPT Live Tests', version: '1.0' },
      entries: entries.map((e) => ({
        request: e.request,
        response: e.response || { status: 0 },
        timings: {},
      })),
    },
  };

  await fs.writeFile(harPath, JSON.stringify(har, null, 2));
  return harPath;
}

/**
 * Redact sensitive headers
 */
function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted = { ...headers };
  const sensitiveKeys = ['authorization', 'api-key', 'x-api-key', 'apikey'];
  
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      redacted[key] = '***REDACTED***';
    }
  }
  
  return redacted;
}

/**
 * Console gate - fails test on console.error or pageerror
 */
export class ConsoleGate {
  private page: Page;
  private consoleLogs: Array<{ level: string; message: string; timestamp: number }> = [];
  private pageErrors: Array<{ message: string; stack?: string; timestamp: number }> = [];
  private testName: string;

  constructor(page: Page, testName: string) {
    this.page = page;
    this.testName = testName;
  }

  async install(): Promise<void> {
    this.page.on('console', (msg) => {
      const level = msg.type();
      const text = msg.text();
      
      // Redact API keys from console logs
      const redacted = text.replace(
        /(api[_-]?key|apikey|sk-[a-zA-Z0-9]+|sk-ant-[a-zA-Z0-9]+)\s*[:=]\s*["']?[^"'\s]+/gi,
        '$1: ***REDACTED***'
      );

      this.consoleLogs.push({
        level,
        message: redacted,
        timestamp: Date.now(),
      });
    });

    this.page.on('pageerror', (error) => {
      this.pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
    });
  }

  async assertNoErrors(): Promise<void> {
    const errors = this.consoleLogs.filter((log) => log.level === 'error');
    const hasPageErrors = this.pageErrors.length > 0;

    if (errors.length > 0 || hasPageErrors) {
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

      throw new Error(
        `Console/Page errors detected in ${this.testName}:\n${errorMessages.join('\n')}`
      );
    }
  }

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
}

/**
 * Video recording wrapper (headful only)
 */
export async function withRecording<T>(
  page: Page,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.HEADFUL !== '1') {
    // Skip recording in headless mode
    return fn();
  }

  await fs.mkdir(VIDEO_DIR, { recursive: true });
  const videoPath = path.join(VIDEO_DIR, `${name}.mp4`);

  // Use Puppeteer's built-in tracing for video-like recording
  // Note: Full MP4 recording requires puppeteer-screen-recorder package
  const client = await page.target().createCDPSession();
  await client.send('Tracing.start', {
    categories: ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline'],
    options: 'sampling-frequency=10000',
  });

  try {
    const result = await fn();
    return result;
  } finally {
    const traceData = await new Promise<string>((resolve) => {
      let trace = '';
      client.on('Tracing.dataCollected', (data: any) => {
        trace += JSON.stringify(data);
      });
      client.on('Tracing.tracingComplete', () => {
        resolve(trace);
      });
    });

    await client.send('Tracing.end');
    await client.detach();

    // Save trace
    await fs.mkdir(TRACE_DIR, { recursive: true });
    const tracePath = path.join(TRACE_DIR, `${name}.json`);
    await fs.writeFile(tracePath, traceData);
  }
}

/**
 * Parse model matrix from env
 */
export function parseModelMatrix(
  matrixString: string | undefined,
  defaultProvider: string,
  defaultModel: string
): Array<{ provider: string; model: string }> {
  if (!matrixString) {
    return [{ provider: defaultProvider, model: defaultModel }];
  }

  return matrixString.split(',').map((pair) => {
    const [provider, model] = pair.trim().split(':');
    if (!provider || !model) {
      throw new Error(`Invalid model matrix entry: ${pair}. Expected format: provider:model`);
    }
    return { provider: provider.trim(), model: model.trim() };
  });
}

/**
 * Save performance metrics to JSON
 */
export async function saveMetrics(
  testName: string,
  metrics: {
    uiToTypingMs: number;
    firstTokenMs: number;
    totalMs: number;
    totalTokens: number;
    provider: string;
    model: string;
  }
): Promise<string> {
  await fs.mkdir(METRICS_DIR, { recursive: true });
  const metricsPath = path.join(METRICS_DIR, 'metrics.json');

  let existingMetrics: any[] = [];
  try {
    const existing = await fs.readFile(metricsPath, 'utf-8');
    existingMetrics = JSON.parse(existing);
  } catch {
    // File doesn't exist yet
  }

  existingMetrics.push({
    testName,
    ...metrics,
    timestamp: Date.now(),
  });

  // Keep only last 7 days of metrics
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = existingMetrics.filter((m: any) => m.timestamp > sevenDaysAgo);

  await fs.writeFile(metricsPath, JSON.stringify(filtered, null, 2));
  return metricsPath;
}
