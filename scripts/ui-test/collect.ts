/**
 * Artifact collection utilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { redactSecrets } from './utils';

export interface Artifact {
  type: 'screenshot' | 'har' | 'log' | 'video' | 'trace' | 'lighthouse' | 'axe' | 'metrics' | 'pixel-diff';
  path: string;
  name: string;
  description?: string;
}

/**
 * Collect artifacts from a directory
 */
export async function collectArtifacts(
  artifactsDir: string,
  sourceDirs: {
    screens?: string;
    har?: string;
    logs?: string;
    video?: string;
    trace?: string;
    lighthouse?: string;
    axe?: string;
    metrics?: string;
    pixelDiff?: string;
  }
): Promise<Artifact[]> {
  const artifacts: Artifact[] = [];

  // Collect screenshots
  if (sourceDirs.screens) {
    const screens = await findFiles(sourceDirs.screens, ['.png', '.jpg', '.jpeg']);
    for (const screen of screens) {
      artifacts.push({
        type: 'screenshot',
        path: screen,
        name: path.basename(screen),
        description: `Screenshot: ${path.basename(screen)}`,
      });
    }
  }

  // Collect HAR files
  if (sourceDirs.har) {
    const hars = await findFiles(sourceDirs.har, ['.har']);
    for (const har of hars) {
      // Redact secrets from HAR
      const content = await fs.readFile(har, 'utf-8');
      const redacted = redactSecrets(content);
      await fs.writeFile(har, redacted);
      
      artifacts.push({
        type: 'har',
        path: har,
        name: path.basename(har),
        description: `HAR: ${path.basename(har)}`,
      });
    }
  }

  // Collect logs
  if (sourceDirs.logs) {
    const logs = await findFiles(sourceDirs.logs, ['.json', '.txt', '.log']);
    for (const log of logs) {
      // Redact secrets from logs
      const content = await fs.readFile(log, 'utf-8');
      const redacted = redactSecrets(content);
      await fs.writeFile(log, redacted);
      
      artifacts.push({
        type: 'log',
        path: log,
        name: path.basename(log),
        description: `Log: ${path.basename(log)}`,
      });
    }
  }

  // Collect videos
  if (sourceDirs.video) {
    const videos = await findFiles(sourceDirs.video, ['.mp4', '.webm']);
    for (const video of videos) {
      artifacts.push({
        type: 'video',
        path: video,
        name: path.basename(video),
        description: `Video: ${path.basename(video)}`,
      });
    }
  }

  // Collect traces
  if (sourceDirs.trace) {
    const traces = await findFiles(sourceDirs.trace, ['.json']);
    for (const trace of traces) {
      artifacts.push({
        type: 'trace',
        path: trace,
        name: path.basename(trace),
        description: `Trace: ${path.basename(trace)}`,
      });
    }
  }

  // Collect Lighthouse reports
  if (sourceDirs.lighthouse) {
    const lhReports = await findFiles(sourceDirs.lighthouse, ['.json', '.html']);
    for (const report of lhReports) {
      artifacts.push({
        type: 'lighthouse',
        path: report,
        name: path.basename(report),
        description: `Lighthouse: ${path.basename(report)}`,
      });
    }
  }

  // Collect axe reports
  if (sourceDirs.axe) {
    const axeReports = await findFiles(sourceDirs.axe, ['.json']);
    for (const report of axeReports) {
      artifacts.push({
        type: 'axe',
        path: report,
        name: path.basename(report),
        description: `Axe: ${path.basename(report)}`,
      });
    }
  }

  // Collect metrics
  if (sourceDirs.metrics) {
    const metrics = await findFiles(sourceDirs.metrics, ['.json']);
    for (const metric of metrics) {
      artifacts.push({
        type: 'metrics',
        path: metric,
        name: path.basename(metric),
        description: `Metrics: ${path.basename(metric)}`,
      });
    }
  }

  // Collect pixel diffs
  if (sourceDirs.pixelDiff) {
    const diffs = await findFiles(sourceDirs.pixelDiff, ['.png', '-diff.png']);
    for (const diff of diffs) {
      artifacts.push({
        type: 'pixel-diff',
        path: diff,
        name: path.basename(diff),
        description: `Pixel diff: ${path.basename(diff)}`,
      });
    }
  }

  return artifacts;
}

/**
 * Find files with given extensions
 */
async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await findFiles(fullPath, extensions));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist, return empty
  }
  
  return files;
}

/**
 * Copy artifact to artifacts directory
 */
export async function copyArtifact(artifact: Artifact, targetDir: string): Promise<string> {
  const targetPath = path.join(targetDir, artifact.name);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(artifact.path, targetPath);
  return targetPath;
}

