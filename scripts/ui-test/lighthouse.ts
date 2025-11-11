/**
 * Lighthouse runner
 */

import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LighthouseResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  jsonPath: string;
  htmlPath: string;
}

/**
 * Run Lighthouse audit
 */
export async function runLighthouse(
  url: string,
  artifactsDir: string
): Promise<LighthouseResult | null> {
  try {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    
    try {
      const options = {
        logLevel: 'info' as const,
        output: ['html', 'json'] as const,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        port: chrome.port,
      };

      const runnerResult = await lighthouse(url, options);
      
      if (!runnerResult) {
        return null;
      }

      const lhDir = path.join(artifactsDir, 'lighthouse');
      await fs.mkdir(lhDir, { recursive: true });

      const jsonPath = path.join(lhDir, 'report.json');
      const htmlPath = path.join(lhDir, 'report.html');

      await fs.writeFile(jsonPath, JSON.stringify(runnerResult.lhr, null, 2));
      await fs.writeFile(htmlPath, runnerResult.report);

      const scores = runnerResult.lhr.categories;

      return {
        performance: Math.round((scores.performance?.score || 0) * 100),
        accessibility: Math.round((scores.accessibility?.score || 0) * 100),
        bestPractices: Math.round((scores['best-practices']?.score || 0) * 100),
        seo: Math.round((scores.seo?.score || 0) * 100),
        jsonPath,
        htmlPath,
      };
    } finally {
      await chrome.kill();
    }
  } catch (error: any) {
    // Lighthouse may fail in some environments, return null instead of throwing
    console.warn(`Lighthouse error: ${error.message}`);
    return null;
  }
}

