/**
 * Pixel diff utilities
 */

import { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface PixelDiffResult {
  passed: boolean;
  diffPath?: string;
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
}

/**
 * Compare screenshot to baseline
 */
export async function compareToBaseline(
  page: Page,
  selector: string,
  baselineName: string,
  artifactsDir: string
): Promise<PixelDiffResult> {
  const baselineDir = path.join(process.cwd(), 'artifacts', '_baseline');
  const baselinePath = path.join(baselineDir, `${baselineName}.png`);
  const diffDir = path.join(artifactsDir, 'pixel-diff');
  await fs.mkdir(diffDir, { recursive: true });

  // Take current screenshot
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  const currentBuffer = await element.screenshot();
  const current = PNG.sync.read(currentBuffer);

  // Check if baseline exists
  try {
    await fs.access(baselinePath);
  } catch {
    // Baseline doesn't exist, save current as baseline
    await fs.mkdir(baselineDir, { recursive: true });
    await fs.writeFile(baselinePath, currentBuffer);
    return {
      passed: true,
      diffPixels: 0,
      totalPixels: current.width * current.height,
      diffPercent: 0,
    };
  }

  // Load baseline
  const baselineBuffer = await fs.readFile(baselinePath);
  const baseline = PNG.sync.read(baselineBuffer);

  // Compare
  if (current.width !== baseline.width || current.height !== baseline.height) {
    return {
      passed: false,
      diffPixels: Infinity,
      totalPixels: current.width * current.height,
      diffPercent: 100,
    };
  }

  const diff = new PNG({ width: current.width, height: current.height });
  const diffPixels = pixelmatch(
    current.data,
    baseline.data,
    diff.data,
    current.width,
    current.height,
    { threshold: 0.1 }
  );

  const totalPixels = current.width * current.height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  // Save diff if there are differences
  if (diffPixels > 0) {
    const diffPath = path.join(diffDir, `${baselineName}-diff.png`);
    await fs.writeFile(diffPath, PNG.sync.write(diff));
    return {
      passed: false,
      diffPath,
      diffPixels,
      totalPixels,
      diffPercent,
    };
  }

  return {
    passed: true,
    diffPixels: 0,
    totalPixels,
    diffPercent: 0,
  };
}

/**
 * Canonical UI states for pixel baselines
 */
export const CANONICAL_STATES = [
  { name: 'idle-overlay', selector: '[data-testid="idle-overlay"]' },
  { name: 'blanket-overlay', selector: '[data-testid="blanket-overlay"]' },
  { name: 'energy-mid-drain', selector: '[data-testid="energy-meter"]' },
  { name: 'typing-indicator', selector: '[data-testid="typing-indicator"]' },
  { name: 'error-toast', selector: '[data-testid="error-message"]' },
];

