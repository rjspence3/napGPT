/**
 * Traceability: verify all capabilities in YAML are covered by tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

interface Capability {
  id: string;
  testId: string;
  priority: 'P0' | 'P1' | 'P2';
}

interface CapabilitiesConfig {
  capabilities: Capability[];
}

/**
 * Load capabilities YAML
 */
export async function loadCapabilities(): Promise<CapabilitiesConfig> {
  const yamlPath = path.join(__dirname, '../config/capabilities.yml');
  const content = await fs.readFile(yamlPath, 'utf-8');
  return yaml.parse(content) as CapabilitiesConfig;
}

/**
 * Extract test IDs from Jest test results
 */
export function extractTestIds(testResults: any[]): Set<string> {
  const testIds = new Set<string>();
  
  testResults.forEach((result) => {
    if (result.testResults) {
      result.testResults.forEach((test: any) => {
        // Extract test name (Jest format: "should ..." or descriptive name)
        testIds.add(test.title);
      });
    }
  });
  
  return testIds;
}

/**
 * Verify coverage: all P0 capabilities have corresponding tests
 */
export function verifyCoverage(
  capabilities: Capability[],
  executedTestIds: Set<string>
): { passed: boolean; missing: Capability[] } {
  const p0Capabilities = capabilities.filter((c) => c.priority === 'P0');
  const missing = p0Capabilities.filter(
    (cap) => !executedTestIds.has(cap.testId)
  );
  
  return {
    passed: missing.length === 0,
    missing,
  };
}

/**
 * Assert coverage in test
 */
export function assertCoverage(
  capabilities: Capability[],
  executedTestIds: Set<string>
): void {
  const { passed, missing } = verifyCoverage(capabilities, executedTestIds);
  
  if (!passed) {
    const missingIds = missing.map((c) => `${c.id} (${c.testId})`).join('\n  - ');
    throw new Error(
      `Coverage check failed. Missing P0 tests:\n  - ${missingIds}`
    );
  }
}

