/**
 * Generate HTML index report for all test artifacts
 */

import * as fs from "fs/promises";
import * as path from "path";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");
const INDEX_PATH = path.join(ARTIFACTS_DIR, "index.html");

interface TestSuite {
  name: string;
  dir: string;
  results?: any;
  screenshots?: string[];
  reports?: string[];
}

async function findTestSuites(): Promise<TestSuite[]> {
  const suites: TestSuite[] = [];

  try {
    const entries = await fs.readdir(ARTIFACTS_DIR, { withFileTypes: true });

    // UI Test Suite
    const uiTestDir = path.join(ARTIFACTS_DIR, "ui-test");
    try {
      const uiResults = await fs.readFile(path.join(uiTestDir, "results.json"), "utf-8");
      const uiScreenshots = (await fs.readdir(uiTestDir)).filter((f) => f.endsWith(".png"));
      suites.push({
        name: "UI Elements Test",
        dir: "ui-test",
        results: JSON.parse(uiResults),
        screenshots: uiScreenshots,
      });
    } catch {
      // UI test not run
    }

    // Visual Test Suite
    const visualTestDir = path.join(ARTIFACTS_DIR, "visual-tests");
    try {
      const visualResults = await fs.readFile(path.join(visualTestDir, "visual-results.json"), "utf-8");
      const visualScreenshots = (await fs.readdir(visualTestDir)).filter((f) => f.endsWith(".png"));
      suites.push({
        name: "Visual Regression Test",
        dir: "visual-tests",
        results: JSON.parse(visualResults),
        screenshots: visualScreenshots,
      });
    } catch {
      // Visual test not run
    }

    // Accessibility Test Suite
    const a11yTestDir = path.join(ARTIFACTS_DIR, "accessibility");
    try {
      const a11yResults = await fs.readFile(path.join(a11yTestDir, "a11y-results.json"), "utf-8");
      suites.push({
        name: "Accessibility Test",
        dir: "accessibility",
        results: JSON.parse(a11yResults),
        reports: ["a11y-results.json", "lighthouse.json"],
      });
    } catch {
      // A11y test not run
    }

    // Behavior Budgets
    const budgetDir = path.join(ARTIFACTS_DIR, "behavior-budgets");
    try {
      const budgetResults = await fs.readFile(path.join(budgetDir, "budget-results.json"), "utf-8");
      suites.push({
        name: "Behavior Budgets",
        dir: "behavior-budgets",
        results: JSON.parse(budgetResults),
      });
    } catch {
      // Budget test not run
    }

    // Performance
    const perfDir = path.join(ARTIFACTS_DIR, "performance");
    try {
      const perfResults = await fs.readFile(path.join(perfDir, "perf-results.json"), "utf-8");
      suites.push({
        name: "Performance Test",
        dir: "performance",
        results: JSON.parse(perfResults),
      });
    } catch {
      // Perf test not run
    }
  } catch (error) {
    console.error("Error reading artifacts:", error);
  }

  return suites;
}

function generateHTML(suites: TestSuite[]): string {
  const timestamp = new Date().toISOString();
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NapGPT Test Report Index</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .suite {
      margin-bottom: 40px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 6px;
      border-left: 4px solid #4CAF50;
    }
    .suite.failed {
      border-left-color: #f44336;
    }
    .suite h2 {
      color: #333;
      margin-bottom: 15px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
    }
    .status.passed {
      background: #4CAF50;
      color: white;
    }
    .status.failed {
      background: #f44336;
      color: white;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f0f0f0;
      font-weight: 600;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .screenshot {
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .screenshot img {
      width: 100%;
      height: auto;
      display: block;
    }
    .screenshot-label {
      padding: 8px;
      background: #f0f0f0;
      font-size: 12px;
      text-align: center;
    }
    a {
      color: #2196F3;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .summary {
      background: #e3f2fd;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .summary h2 {
      margin-bottom: 10px;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .stat {
      text-align: center;
      padding: 15px;
      background: white;
      border-radius: 4px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #2196F3;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 NapGPT Test Report Index</h1>
    <div class="timestamp">Generated: ${timestamp}</div>
`;

  // Summary stats
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  suites.forEach((suite) => {
    if (suite.results?.summary) {
      totalPassed += suite.results.summary.passed || 0;
      totalFailed += suite.results.summary.failed || 0;
      totalTests += (suite.results.summary.passed || 0) + (suite.results.summary.failed || 0);
    } else if (suite.results?.results) {
      suite.results.results.forEach((r: any) => {
        totalTests++;
        if (r.passed) totalPassed++;
        else totalFailed++;
      });
    }
  });

  html += `
    <div class="summary">
      <h2>📊 Summary</h2>
      <div class="summary-stats">
        <div class="stat">
          <div class="stat-value">${totalTests}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #4CAF50">${totalPassed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #f44336">${totalFailed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: ${totalFailed === 0 ? '#4CAF50' : '#f44336'}">${totalFailed === 0 ? '100' : Math.round((totalPassed / totalTests) * 100)}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
      </div>
    </div>
`;

  // Test suites
  suites.forEach((suite) => {
    const hasFailed = suite.results?.summary?.failed > 0 || suite.results?.results?.some((r: any) => !r.passed);
    html += `
    <div class="suite ${hasFailed ? 'failed' : ''}">
      <h2>
        ${suite.name}
        <span class="status ${hasFailed ? 'failed' : 'passed'}">
          ${hasFailed ? '❌ Failed' : '✅ Passed'}
        </span>
      </h2>
`;

    if (suite.results?.summary) {
      html += `
      <p><strong>Passed:</strong> ${suite.results.summary.passed || 0} | 
         <strong>Failed:</strong> ${suite.results.summary.failed || 0} | 
         <strong>Total:</strong> ${(suite.results.summary.passed || 0) + (suite.results.summary.failed || 0)}</p>
`;
    }

    if (suite.screenshots && suite.screenshots.length > 0) {
      html += `
      <h3>Screenshots</h3>
      <div class="screenshot-grid">
`;
      suite.screenshots.forEach((screenshot) => {
        html += `
        <div class="screenshot">
          <img src="${suite.dir}/${screenshot}" alt="${screenshot}" onerror="this.style.display='none'">
          <div class="screenshot-label">${screenshot}</div>
        </div>
`;
      });
      html += `      </div>`;
    }

    if (suite.reports && suite.reports.length > 0) {
      html += `
      <h3>Reports</h3>
      <ul>
`;
      suite.reports.forEach((report) => {
        html += `        <li><a href="${suite.dir}/${report}">${report}</a></li>\n`;
      });
      html += `      </ul>`;
    }

    html += `    </div>`;
  });

  html += `
  </div>
</body>
</html>`;

  return html;
}

async function main() {
  console.log("📄 Generating HTML index report...\n");

  const suites = await findTestSuites();
  console.log(`Found ${suites.length} test suite(s)`);

  const html = generateHTML(suites);
  await fs.writeFile(INDEX_PATH, html);

  console.log(`✅ HTML index generated: ${INDEX_PATH}`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

