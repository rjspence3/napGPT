/**
 * Guardrail checks: enforce test quality rules
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Check for waitForTimeout usage (forbidden)
 */
export async function checkWaitForTimeout(): Promise<{ passed: boolean; violations: string[] }> {
  const { glob } = await import('glob');
  const testFiles = await glob('tests/**/*.spec.ts', { absolute: true });
  const violations: string[] = [];
  
  for (const file of testFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('waitForTimeout') || line.includes('page.waitForTimeout')) {
        violations.push(`${file}:${index + 1} - ${line.trim()}`);
      }
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Check for Math.random() usage (should use seeded RNG)
 */
export async function checkMathRandom(): Promise<{ passed: boolean; violations: string[] }> {
  const { glob } = await import('glob');
  const testFiles = await glob('tests/**/*.spec.ts', { absolute: true });
  const violations: string[] = [];
  
  for (const file of testFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('Math.random()') && !line.includes('// ALLOWED')) {
        violations.push(`${file}:${index + 1} - ${line.trim()}`);
      }
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Check for data-testid on interactive selectors
 */
export async function checkDataTestIds(): Promise<{ passed: boolean; violations: string[] }> {
  const { glob } = await import('glob');
  const testFiles = await glob('tests/**/*.spec.ts', { absolute: true });
  const violations: string[] = [];
  
  for (const file of testFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for selectors that should use data-testid
      if (
        (line.includes("page.$('button") || line.includes("page.$('input") || line.includes("page.$('a")) &&
        !line.includes('data-testid') &&
        !line.includes('// ALLOWED')
      ) {
        violations.push(`${file}:${index + 1} - ${line.trim()}`);
      }
    });
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Run all guardrail checks
 */
export async function runGuardrails(): Promise<{ passed: boolean; results: any }> {
  const [waitForTimeout, mathRandom, dataTestIds] = await Promise.all([
    checkWaitForTimeout(),
    checkMathRandom(),
    checkDataTestIds(),
  ]);
  
  const passed = waitForTimeout.passed && mathRandom.passed && dataTestIds.passed;
  
  return {
    passed,
    results: {
      waitForTimeout,
      mathRandom,
      dataTestIds,
    },
  };
}

