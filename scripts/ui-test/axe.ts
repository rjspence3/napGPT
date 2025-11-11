/**
 * Axe accessibility scanner
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AxeResult {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  jsonPath: string;
}

/**
 * Run Axe accessibility scan
 */
export async function runAxe(
  url: string,
  artifactsDir: string,
  headful: boolean
): Promise<AxeResult | null> {
  const browser = await puppeteer.launch({
    headless: !headful,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Inject axe-core
    await page.addScriptTag({ url: 'https://unpkg.com/axe-core@4.9.1/axe.min.js' });

    // Run axe
    const results = await page.evaluate(() => {
      return (window as any).axe.run(document, {
        rules: {},
      });
    });

    // Count violations by impact
    const critical = results.violations.filter((v: any) => v.impact === 'critical').length;
    const serious = results.violations.filter((v: any) => v.impact === 'serious').length;
    const moderate = results.violations.filter((v: any) => v.impact === 'moderate').length;
    const minor = results.violations.filter((v: any) => v.impact === 'minor').length;

    // Save results
    const axeDir = path.join(artifactsDir, 'axe');
    await fs.mkdir(axeDir, { recursive: true });
    const jsonPath = path.join(axeDir, 'report.json');
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));

    return {
      critical,
      serious,
      moderate,
      minor,
      jsonPath,
    };
  } finally {
    await browser.close();
  }
}

