/**
 * Accessibility testing with axe-core
 */

import { Page } from 'puppeteer';

interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes: Array<{ html: string; target: string[] }>;
}

interface AxeResults {
  violations: AxeViolation[];
  passes: any[];
  incomplete: any[];
}

/**
 * Inject axe-core into page
 */
export async function injectAxe(page: Page): Promise<void> {
  await page.addScriptTag({
    url: 'https://unpkg.com/axe-core@4.9.1/axe.min.js',
  });
  
  // Wait for axe to load
  await page.waitForFunction(
    () => (window as any).axe !== undefined,
    { timeout: 5000 }
  );
}

/**
 * Run axe accessibility check
 */
export async function runAxe(page: Page): Promise<AxeResults> {
  await injectAxe(page);
  
  const results = await page.evaluate(() => {
    return (window as any).axe.run().then((results: any) => results);
  });
  
  return results;
}

/**
 * Assert zero P0 (critical/serious) violations
 */
export function assertNoP0Violations(results: AxeResults): void {
  const p0Violations = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  
  if (p0Violations.length > 0) {
    const messages = p0Violations.map((v) => 
      `${v.id} (${v.impact}): ${v.description}`
    );
    throw new Error(
      `Found ${p0Violations.length} P0 accessibility violations:\n${messages.join('\n')}`
    );
  }
}

/**
 * Get violations for specific selectors (P0 elements)
 */
export function getP0Violations(
  results: AxeResults,
  selectors: string[]
): AxeViolation[] {
  const p0Violations = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  
  return p0Violations.filter((v) =>
    v.nodes.some((node) =>
      selectors.some((sel) => node.target.includes(sel))
    )
  );
}

