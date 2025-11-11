/**
 * Pixel diff utilities for visual regression testing
 */

import * as fs from "fs/promises";
import * as path from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export interface PixelDiffResult {
  mismatches: number;
  diffPath: string;
  passed: boolean;
  threshold: number;
}

export async function comparePng(
  aPath: string,
  bPath: string,
  diffPath: string,
  threshold: number = 0.1
): Promise<PixelDiffResult> {
  const aBuffer = await fs.readFile(aPath);
  const bBuffer = await fs.readFile(bPath);

  const a = PNG.sync.read(aBuffer);
  const b = PNG.sync.read(bBuffer);

  const { width, height } = a;

  if (b.width !== width || b.height !== height) {
    throw new Error(`Image dimensions mismatch: ${width}x${height} vs ${b.width}x${b.height}`);
  }

  const diff = new PNG({ width, height });
  const mismatches = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: 0.1,
  });

  // Write diff image
  await fs.mkdir(path.dirname(diffPath), { recursive: true });
  await fs.writeFile(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const mismatchRatio = mismatches / totalPixels;
  const passed = mismatchRatio <= threshold;

  return {
    mismatches,
    diffPath,
    passed,
    threshold,
  };
}

export async function ensureBaselineDir(): Promise<string> {
  const baselineDir = path.join(process.cwd(), "artifacts", "_baseline");
  await fs.mkdir(baselineDir, { recursive: true });
  return baselineDir;
}

export async function getBaselinePath(name: string): Promise<string> {
  const baselineDir = await ensureBaselineDir();
  return path.join(baselineDir, `${name}.png`);
}

export async function saveBaseline(name: string, screenshotPath: string): Promise<void> {
  const baselinePath = await getBaselinePath(name);
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.copyFile(screenshotPath, baselinePath);
}

export async function compareWithBaseline(
  name: string,
  screenshotPath: string,
  diffPath: string,
  threshold: number = 0.1
): Promise<PixelDiffResult | null> {
  const baselinePath = await getBaselinePath(name);

  try {
    await fs.access(baselinePath);
  } catch {
    // Baseline doesn't exist, save current as baseline
    await saveBaseline(name, screenshotPath);
    return null;
  }

  return comparePng(baselinePath, screenshotPath, diffPath, threshold);
}


