/**
 * Network interception and HAR capture
 */

import { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

const HAR_DIR = (global as any).HAR_DIR || 'artifacts/ui-test/har';

interface ChatPostCapture {
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

/**
 * Capture POST request to /api/chat
 */
export async function captureChatPost(page: Page): Promise<ChatPostCapture | null> {
  return new Promise((resolve) => {
    const handler = async (request: any) => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        const postData = request.postData();
        if (postData) {
          try {
            const body = JSON.parse(postData);
            page.off('request', handler);
            resolve({
              url: request.url(),
              method: request.method(),
              body,
              timestamp: Date.now(),
            });
          } catch (e) {
            // Invalid JSON
          }
        }
      }
    };
    page.on('request', handler);
    // Timeout after 10s
    setTimeout(() => {
      page.off('request', handler);
      resolve(null);
    }, 10000);
  });
}

/**
 * Count SSE/WebSocket chunks for streaming detection
 */
export async function countSseChunks(
  page: Page,
  urlPattern: string | RegExp
): Promise<number> {
  let chunkCount = 0;
  const pattern = typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern;

  const handler = (response: any) => {
    if (pattern.test(response.url())) {
      // Check if response is streaming (chunked transfer)
      const headers = response.headers();
      if (headers['transfer-encoding'] === 'chunked' || headers['content-type']?.includes('text/event-stream')) {
        chunkCount++;
      }
    }
  };

  page.on('response', handler);
  
  // Wait a bit for chunks
  await new Promise((resolve) => setTimeout(resolve, 5000));
  
  page.off('response', handler);
  return chunkCount;
}

/**
 * Save HAR (HTTP Archive) for a page
 */
export async function saveHar(page: Page, name: string): Promise<string> {
  await fs.mkdir(HAR_DIR, { recursive: true });
  const harPath = path.join(HAR_DIR, `${name}.har`);

  // Get network logs from CDP
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');

  const entries: any[] = [];
  
  const requestHandler = (request: any) => {
    entries.push({
      request: {
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData(),
      },
      timestamp: Date.now(),
    });
  };

  const responseHandler = async (response: any) => {
    const entry = entries.find((e) => e.request.url === response.url());
    if (entry) {
      entry.response = {
        status: response.status(),
        headers: response.headers(),
      };
    }
  };

  page.on('request', requestHandler);
  page.on('response', responseHandler);

  // Wait a bit for network activity
  await new Promise((resolve) => setTimeout(resolve, 2000));

  page.off('request', requestHandler);
  page.off('response', responseHandler);

  const har = {
    log: {
      version: '1.2',
      creator: { name: 'NapGPT Tests', version: '1.0' },
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
 * Intercept and mock API responses
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status: number = 200
): Promise<void> {
  // Check if already intercepting
  const isIntercepting = (page as any)._requestInterceptionEnabled;
  
  if (!isIntercepting) {
    await page.setRequestInterception(true);
  }
  
  const handler = (request: any) => {
    const url = request.url();
    const pattern = typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern;
    
    if (pattern.test(url)) {
      request.respond({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    } else {
      request.continue();
    }
  };
  
  page.on('request', handler);
  
  // Return cleanup function
  return new Promise((resolve) => {
    setTimeout(() => {
      page.off('request', handler);
      resolve();
    }, 100);
  }) as any;
}

