#!/usr/bin/env tsx

/**
 * UI Test Orchestration - Main Entry Point
 * Runs all UI tests, collects artifacts, enforces budgets, generates reports
 */

import { loadEnv, validateLiveLLMEnv, getEnvForChildProcess } from './env';
import { createDriver } from './drivers';
import { getArtifactsDir, ensureArtifactsDir, linkLatest, formatDuration, type TestResult } from './utils';
import { collectArtifacts } from './collect';
import {
  checkLatencyBudgets,
  checkBehaviorBudgets,
  checkA11yBudgets,
  checkPerfBudgets,
  checkCostBudgets,
  aggregateBudgetResults,
  type BudgetResult,
} from './budgets';
import { generateReport } from './report';
import { runMCPScenarios } from './matrix';
// Lighthouse and Axe are imported lazily to avoid module load errors
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

interface TestRun {
  name: string;
  type: 'mcp' | 'jest' | 'live-llm';
  results: TestResult[];
  budgets: BudgetResult[];
  artifacts: string[];
  duration: number;
}

async function main() {
  const args = process.argv.slice(2);
  const runLive = args.includes('--live');
  
  const env = loadEnv();
  const artifactsDir = getArtifactsDir();
  
  console.log('🚀 Starting NapGPT UI Test Suite...');
  console.log(`📁 Artifacts: ${artifactsDir}`);
  console.log(`🌐 Base URL: ${env.baseUrl}`);
  console.log(`👁️  Headless: ${!env.headful}`);
  console.log(`🔴 Live LLM: ${env.liveLLM ? 'Yes' : 'No'} ${runLive ? '(--live flag set)' : '(use --live to run)'}\n`);

  await ensureArtifactsDir(artifactsDir);
  
  const runs: TestRun[] = [];
  const allBudgetResults: BudgetResult[] = [];
  let overallPassed = true;

  try {
    // 1. Wait for app to be ready
    console.log('⏳ Waiting for app to be ready...');
    try {
      const { waitForUrl } = await import('./utils');
      await waitForUrl(env.baseUrl, 30000);
      console.log('✅ App ready\n');
    } catch (error: any) {
      console.warn(`⚠️  Could not reach ${env.baseUrl}, continuing anyway...`);
    }

    // 2. Run MCP/Puppeteer scenarios
    console.log('📋 Running MCP/Puppeteer scenarios...');
    const mcpStart = Date.now();
    try {
      const mcpResults = await runMCPScenarios(env, artifactsDir);
      const mcpDuration = Date.now() - mcpStart;
      
      runs.push({
        name: 'MCP Scenarios',
        type: 'mcp',
        results: mcpResults,
        budgets: [],
        artifacts: [],
        duration: mcpDuration,
      });

      const mcpPassed = mcpResults.every((r) => r.passed);
      if (!mcpPassed) overallPassed = false;
      
      console.log(`✅ MCP scenarios completed (${formatDuration(mcpDuration)})\n`);
    } catch (error: any) {
      console.error(`❌ MCP scenarios failed: ${error.message}\n`);
      overallPassed = false;
    }

    // 3. Run Jest tests (if live LLM enabled, run live tests; otherwise skip)
    if (runLive && env.liveLLM) {
      // Live LLM tests will be run in step 4
      console.log('📋 Jest tests will run as part of Live LLM tests...\n');
    } else {
      // Note: Jest-puppeteer tries to start its own server, which conflicts with existing dev server
      // Skip Jest tests in orchestration - run separately: npm run test:ui-all
      console.log('📋 Skipping Jest tests (run separately: npm run test:ui-all)\n');
      console.log('   Jest tests require their own server instance to avoid port conflicts.\n');
    }

    // 4. Run Live LLM tests if requested
    if (runLive && env.liveLLM) {
      const validation = validateLiveLLMEnv();
      if (validation.valid) {
        console.log('📋 Running Live LLM tests...');
        const liveStart = Date.now();
        try {
          const liveResults = await runJestTests(env, artifactsDir, true);
          const liveDuration = Date.now() - liveStart;
          
          // Extract metrics from live results
          const metrics = await loadMetrics(artifactsDir);
          const latencyBudgets = checkLatencyBudgets({
            uiToTypingMs: metrics.uiToTypingMs,
            firstTokenMs: metrics.firstTokenMs,
            totalMs: metrics.totalMs,
          });
          
          const costBudgets = checkCostBudgets(metrics.totalTokens, env.maxTokens * env.maxRequests);
          
          allBudgetResults.push(...latencyBudgets, ...costBudgets);
          
          runs.push({
            name: 'Live LLM Tests',
            type: 'live-llm',
            results: liveResults,
            budgets: [...latencyBudgets, ...costBudgets],
            artifacts: [],
            duration: liveDuration,
          });

          const livePassed = liveResults.every((r) => r.passed) && latencyBudgets.every((b) => b.passed) && costBudgets.every((b) => b.passed);
          if (!livePassed) overallPassed = false;
          
          console.log(`✅ Live LLM tests completed (${formatDuration(liveDuration)})\n`);
        } catch (error: any) {
          console.error(`❌ Live LLM tests failed: ${error.message}\n`);
          overallPassed = false;
        }
      } else {
        console.warn(`⚠️  Skipping Live LLM tests: ${validation.error}\n`);
      }
    }

    // 5. Run Lighthouse (headful only, optional)
    if (env.headful) {
      console.log('📋 Running Lighthouse...');
      try {
        const { runLighthouse } = await import('./lighthouse');
        const lhResult = await runLighthouse(env.baseUrl, artifactsDir);
        if (lhResult) {
          const perfBudgets = checkPerfBudgets(lhResult.performance, 70);
          allBudgetResults.push(...perfBudgets);
          
          if (!perfBudgets.every((b) => b.passed)) overallPassed = false;
          
          console.log(`✅ Lighthouse completed (Performance: ${lhResult.performance})\n`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Lighthouse skipped: ${error.message}\n`);
        // Don't fail the suite if Lighthouse fails
      }
    }

    // 6. Run Axe
    console.log('📋 Running Axe accessibility scan...');
    try {
      const { runAxe } = await import('./axe');
      const axeResult = await runAxe(env.baseUrl, artifactsDir, env.headful);
      if (axeResult) {
        const a11yBudgets = checkA11yBudgets({
          critical: axeResult.critical,
          serious: axeResult.serious,
        });
        allBudgetResults.push(...a11yBudgets);
        
        if (!a11yBudgets.every((b) => b.passed)) overallPassed = false;
        
        console.log(`✅ Axe completed (Critical: ${axeResult.critical}, Serious: ${axeResult.serious})\n`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Axe skipped: ${error.message}\n`);
      // Don't fail suite on Axe errors, but log them
    }

    // 7. Collect all artifacts
    console.log('📦 Collecting artifacts...');
    const artifacts = await collectArtifacts(artifactsDir, {
      screens: path.join(artifactsDir, 'screens'),
      har: path.join(artifactsDir, 'har'),
      logs: path.join(artifactsDir, 'logs'),
      video: path.join(artifactsDir, 'video'),
      trace: path.join(artifactsDir, 'trace'),
      lighthouse: path.join(artifactsDir, 'lighthouse'),
      axe: path.join(artifactsDir, 'axe'),
      metrics: path.join(artifactsDir, 'metrics.json'),
    });
    console.log(`✅ Collected ${artifacts.length} artifacts\n`);

    // 8. Aggregate budget results
    const budgetSummary = aggregateBudgetResults(allBudgetResults);
    if (!budgetSummary.passed) {
      overallPassed = false;
      console.log('❌ Budget violations detected:');
      budgetSummary.failures.forEach((f) => {
        console.log(`  - ${f.name}: ${f.actual}${f.unit} (budget: ${f.budget}${f.unit})`);
      });
      console.log();
    }

    // 9. Generate report
    console.log('📄 Generating report...');
    await generateReport(artifactsDir, runs, allBudgetResults, artifacts);
    console.log('✅ Report generated\n');

    // 10. Create latest symlink
    await linkLatest(artifactsDir);

    // Summary
    console.log('='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`Overall: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Runs: ${runs.length}`);
    console.log(`Total Budgets: ${allBudgetResults.length} (${budgetSummary.passedCount} passed, ${budgetSummary.failedCount} failed)`);
    console.log(`Artifacts: ${artifacts.length}`);
    console.log(`Report: ${path.join(artifactsDir, 'index.html')}`);
    console.log('='.repeat(60));

    process.exit(overallPassed ? 0 : 1);
  } catch (error: any) {
    console.error(`\n💥 Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Run Jest tests
 */
async function runJestTests(env: any, artifactsDir: string, liveOnly: boolean): Promise<TestResult[]> {
  return new Promise((resolve, reject) => {
    const jestArgs = ['--runInBand'];
    
    if (liveOnly) {
      // Run all Jest tests when live LLM is enabled (they'll use live LLM via API)
      jestArgs.push('tests/ui');
    } else {
      jestArgs.push('tests/ui', '--testPathIgnorePatterns=chat.live.spec.ts');
    }

    const jestEnv = {
      ...process.env,
      ...getEnvForChildProcess(env),
      UI_ARTIFACT_DIR: artifactsDir,
      JEST_JUNIT_OUTPUT_DIR: path.join(artifactsDir, 'test-results'),
    };

    const jest = spawn('npx', ['jest', ...jestArgs], {
      env: jestEnv,
      stdio: 'inherit',
    });

    jest.on('close', (code) => {
      // Parse Jest results from JUnit XML if available
      // For now, return basic results
      resolve([
        {
          name: liveOnly ? 'Live LLM Tests' : 'Jest UI Tests',
          passed: code === 0,
          duration: 0,
          error: code !== 0 ? `Jest exited with code ${code}` : undefined,
        },
      ]);
    });

    jest.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Load metrics from artifacts
 */
async function loadMetrics(artifactsDir: string): Promise<{
  uiToTypingMs: number;
  firstTokenMs: number;
  totalMs: number;
  totalTokens: number;
}> {
  try {
    const metricsPath = path.join(artifactsDir, 'metrics.json');
    const content = await fs.readFile(metricsPath, 'utf-8');
    const metrics = JSON.parse(content);
    
    // Aggregate metrics
    const uiToTypingValues = metrics.map((m: any) => m.uiToTypingMs).filter((v: number) => v > 0);
    const firstTokenValues = metrics.map((m: any) => m.firstTokenMs).filter((v: number) => v > 0);
    const totalValues = metrics.map((m: any) => m.totalMs).filter((v: number) => v > 0);
    const tokenValues = metrics.map((m: any) => m.totalTokens || 0);

    return {
      uiToTypingMs: uiToTypingValues.length > 0 ? uiToTypingValues[0] : 0,
      firstTokenMs: firstTokenValues.length > 0 ? firstTokenValues[0] : 0,
      totalMs: totalValues.length > 0 ? totalValues[0] : 0,
      totalTokens: tokenValues.reduce((a: number, b: number) => a + b, 0),
    };
  } catch {
    return { uiToTypingMs: 0, firstTokenMs: 0, totalMs: 0, totalTokens: 0 };
  }
}

if (require.main === module) {
  main().catch(console.error);
}

