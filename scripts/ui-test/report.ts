/**
 * Report generator (Markdown + HTML)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestResult } from './utils';
import type { BudgetResult } from './budgets';
import type { Artifact } from './collect';
import { formatDuration } from './utils';

interface TestRun {
  name: string;
  type: 'mcp' | 'jest' | 'live-llm';
  results: TestResult[];
  budgets: BudgetResult[];
  artifacts: string[];
  duration: number;
}

/**
 * Generate report (Markdown + HTML)
 */
export async function generateReport(
  artifactsDir: string,
  runs: TestRun[],
  budgets: BudgetResult[],
  artifacts: Artifact[]
): Promise<void> {
  const reportMd = generateMarkdown(runs, budgets, artifacts);
  const reportHtml = generateHTML(runs, budgets, artifacts);

  await fs.writeFile(path.join(artifactsDir, 'report.md'), reportMd);
  await fs.writeFile(path.join(artifactsDir, 'index.html'), reportHtml);
}

/**
 * Generate Markdown report
 */
function generateMarkdown(runs: TestRun[], budgets: BudgetResult[], artifacts: Artifact[]): string {
  const totalTests = runs.reduce((sum, run) => sum + run.results.length, 0);
  const passedTests = runs.reduce((sum, run) => sum + run.results.filter((r) => r.passed).length, 0);
  const failedTests = totalTests - passedTests;
  const totalDuration = runs.reduce((sum, run) => sum + run.duration, 0);
  
  const passedBudgets = budgets.filter((b) => b.passed).length;
  const failedBudgets = budgets.filter((b) => !b.passed).length;

  let md = `# NapGPT UI Test Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Tests:** ${passedTests}/${totalTests} passed (${failedTests} failed)\n`;
  md += `- **Budgets:** ${passedBudgets}/${budgets.length} passed (${failedBudgets} failed)\n`;
  md += `- **Duration:** ${formatDuration(totalDuration)}\n`;
  md += `- **Artifacts:** ${artifacts.length}\n\n`;

  // Test runs
  md += `## Test Runs\n\n`;
  for (const run of runs) {
    md += `### ${run.name}\n\n`;
    md += `- **Type:** ${run.type}\n`;
    md += `- **Duration:** ${formatDuration(run.duration)}\n`;
    md += `- **Results:** ${run.results.filter((r) => r.passed).length}/${run.results.length} passed\n\n`;
    
    if (run.results.length > 0) {
      md += `| Test | Status | Duration |\n`;
      md += `|------|--------|----------|\n`;
      for (const result of run.results) {
        md += `| ${result.name} | ${result.passed ? '✅' : '❌'} | ${formatDuration(result.duration)} |\n`;
        if (result.error) {
          md += `  - Error: ${result.error}\n`;
        }
      }
      md += `\n`;
    }
  }

  // Budgets
  if (budgets.length > 0) {
    md += `## Budgets\n\n`;
    md += `| Budget | Status | Actual | Budget | Unit |\n`;
    md += `|--------|--------|--------|--------|------|\n`;
    for (const budget of budgets) {
      md += `| ${budget.name} | ${budget.passed ? '✅' : '❌'} | ${budget.actual} | ${budget.budget} | ${budget.unit} |\n`;
      if (budget.error) {
        md += `  - ${budget.error}\n`;
      }
    }
    md += `\n`;
  }

  // Artifacts
  if (artifacts.length > 0) {
    md += `## Artifacts\n\n`;
    for (const artifact of artifacts) {
      md += `- **${artifact.type}:** ${artifact.name}\n`;
      if (artifact.description) {
        md += `  - ${artifact.description}\n`;
      }
    }
  }

  return md;
}

/**
 * Generate HTML report
 */
function generateHTML(runs: TestRun[], budgets: BudgetResult[], artifacts: Artifact[]): string {
  const totalTests = runs.reduce((sum, run) => sum + run.results.length, 0);
  const passedTests = runs.reduce((sum, run) => sum + run.results.filter((r) => r.passed).length, 0);
  const failedTests = totalTests - passedTests;
  const totalDuration = runs.reduce((sum, run) => sum + run.duration, 0);
  
  const passedBudgets = budgets.filter((b) => b.passed).length;
  const failedBudgets = budgets.filter((b) => !b.passed).length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NapGPT UI Test Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .card { background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .card h3 { margin: 0 0 10px 0; }
    .card .value { font-size: 2em; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; }
    .pass { color: green; }
    .fail { color: red; }
    .artifact-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
    .artifact { padding: 10px; background: #f9f9f9; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>NapGPT UI Test Report</h1>
  <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
  
  <div class="summary">
    <div class="card">
      <h3>Tests</h3>
      <div class="value ${passedTests === totalTests ? 'pass' : 'fail'}">${passedTests}/${totalTests}</div>
    </div>
    <div class="card">
      <h3>Budgets</h3>
      <div class="value ${failedBudgets === 0 ? 'pass' : 'fail'}">${passedBudgets}/${budgets.length}</div>
    </div>
    <div class="card">
      <h3>Duration</h3>
      <div class="value">${formatDuration(totalDuration)}</div>
    </div>
    <div class="card">
      <h3>Artifacts</h3>
      <div class="value">${artifacts.length}</div>
    </div>
  </div>

  <h2>Test Runs</h2>
  ${runs.map((run) => `
    <h3>${run.name}</h3>
    <p><strong>Type:</strong> ${run.type} | <strong>Duration:</strong> ${formatDuration(run.duration)}</p>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Status</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${run.results.map((r) => `
          <tr>
            <td>${r.name}</td>
            <td class="${r.passed ? 'pass' : 'fail'}">${r.passed ? '✅ Pass' : '❌ Fail'}</td>
            <td>${formatDuration(r.duration)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}

  ${budgets.length > 0 ? `
    <h2>Budgets</h2>
    <table>
      <thead>
        <tr>
          <th>Budget</th>
          <th>Status</th>
          <th>Actual</th>
          <th>Budget</th>
          <th>Unit</th>
        </tr>
      </thead>
      <tbody>
        ${budgets.map((b) => `
          <tr>
            <td>${b.name}</td>
            <td class="${b.passed ? 'pass' : 'fail'}">${b.passed ? '✅' : '❌'}</td>
            <td>${b.actual}</td>
            <td>${b.budget}</td>
            <td>${b.unit}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <h2>Artifacts</h2>
  <div class="artifact-list">
    ${artifacts.map((a) => `
      <div class="artifact">
        <strong>${a.type}</strong><br>
        ${a.name}<br>
        <small>${a.description || ''}</small>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  return html;
}

