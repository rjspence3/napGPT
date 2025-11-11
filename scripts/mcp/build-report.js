#!/usr/bin/env node

/**
 * Build HTML/Markdown report from test artifacts
 */

const fs = require("fs/promises");
const path = require("path");
const config = require("./config");

async function findLatestResults() {
  const artifactsDir = config.artifactsDir;
  const entries = await fs.readdir(artifactsDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse();

  if (dirs.length === 0) {
    throw new Error("No test results found");
  }

  return path.join(artifactsDir, dirs[0]);
}

async function buildReport() {
  try {
    const resultsDir = await findLatestResults();
    console.log(`📁 Reading results from: ${resultsDir}`);

    const resultsFile = path.join(resultsDir, "results.json");
    const { timestamp, results } = JSON.parse(await fs.readFile(resultsFile, "utf-8"));

    // Build markdown report
    const report = [];
    report.push(`# NapGPT UI MCP Report — ${timestamp}`);
    report.push("");
    report.push("## Summary");
    report.push("");
    report.push("| Scenario | Pass | Duration (ms) | Notes |");
    report.push("|----------|------|---------------|-------|");

    for (const result of results) {
      const status = result.passed ? "✅" : "❌";
      const duration = result.duration || 0;
      const firstNote = result.notes?.[0] || "-";
      report.push(`| ${result.scenario} | ${status} | ${duration} | ${firstNote.substring(0, 50)}... |`);
    }

    report.push("");
    report.push("## Detailed Results");
    report.push("");

    for (const result of results) {
      report.push(`### ${result.scenario}: ${result.description || ""}`);
      report.push("");
      report.push(`- **Status**: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`);
      report.push(`- **Duration**: ${result.duration}ms`);
      report.push("");

      if (result.notes && result.notes.length > 0) {
        report.push("**Notes:**");
        result.notes.forEach((note) => report.push(`- ${note}`));
        report.push("");
      }

      // Check for artifacts
      const scenarioDir = path.join(resultsDir, result.scenario);
      try {
        const artifacts = await fs.readdir(scenarioDir);
        if (artifacts.length > 0) {
          report.push("**Artifacts:**");
          artifacts.forEach((artifact) => {
            const artifactPath = path.join(scenarioDir, artifact);
            report.push(`- [${artifact}](${artifactPath})`);
          });
          report.push("");
        }
      } catch {
        // No artifacts directory
      }

      // Special handling for results with data
      if (result.results) {
        report.push("**Results:**");
        report.push("```json");
        report.push(JSON.stringify(result.results, null, 2));
        report.push("```");
        report.push("");
      }

      if (result.energyReadings) {
        report.push("**Energy Readings:**");
        report.push(`\`${result.energyReadings.join(" → ")}\``);
        report.push("");
      }

      report.push("---");
      report.push("");
    }

    // Save report
    const reportFile = path.join(resultsDir, "report.md");
    await fs.writeFile(reportFile, report.join("\n"));
    console.log(`✅ Report saved to: ${reportFile}`);

    // Also save to artifacts root
    const rootReportFile = path.join(config.artifactsDir, "report.md");
    await fs.writeFile(rootReportFile, report.join("\n"));
    console.log(`✅ Report also saved to: ${rootReportFile}`);
  } catch (error) {
    console.error(`❌ Error building report: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  buildReport();
}

module.exports = { buildReport };


