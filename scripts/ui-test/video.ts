/**
 * Video recording utilities (headful only)
 * Note: Full MP4 recording requires puppeteer-screen-recorder package
 */

import { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Record video of test execution (headful only)
 * Falls back to DevTools trace if puppeteer-screen-recorder not available
 */
export async function withVideoRecording<T>(
  page: Page,
  name: string,
  artifactsDir: string,
  fn: () => Promise<T>
): Promise<T> {
  const videoDir = path.join(artifactsDir, 'video');
  await fs.mkdir(videoDir, { recursive: true });

  // Try to use puppeteer-screen-recorder if available
  try {
    const { PuppeteerScreenRecorder } = await import('puppeteer-screen-recorder');
    const recorder = new PuppeteerScreenRecorder(page, { followNewTab: true });
    const videoPath = path.join(videoDir, `${name}.mp4`);
    
    await recorder.start(videoPath);
    try {
      return await fn();
    } finally {
      await recorder.stop();
    }
  } catch {
    // Fallback to DevTools trace
    const client = await page.target().createCDPSession();
    await client.send('Tracing.start', {
      categories: ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline'],
      options: 'sampling-frequency=10000',
    });

    try {
      return await fn();
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

      const traceDir = path.join(artifactsDir, 'trace');
      await fs.mkdir(traceDir, { recursive: true });
      const tracePath = path.join(traceDir, `${name}.json`);
      await fs.writeFile(tracePath, traceData);
    }
  }
}

