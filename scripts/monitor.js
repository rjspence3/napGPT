#!/usr/bin/env node

/**
 * Monitors the Next.js dev server and restarts it if it becomes unhealthy
 */

const { spawn } = require('child_process');
const http = require('http');

const PORT = 3000;
const HEALTH_CHECK_URL = `http://localhost:${PORT}/api/mode`;
const HEALTH_CHECK_INTERVAL = 5000; // Check every 5 seconds
const MAX_FAILURES = 3; // Restart after 3 consecutive failures
const STARTUP_TIMEOUT = 30000; // 30 seconds to start up

let devProcess = null;
let failureCount = 0;
let isStarting = false;
let lastHealthCheck = null;

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_CHECK_URL, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startDevServer() {
  if (isStarting || devProcess) {
    return;
  }

  isStarting = true;
  log('🚀 Starting Next.js dev server...');

  // Determine package manager
  const packageManager = process.env.PACKAGE_MANAGER || 'npm';
  const command = packageManager === 'pnpm' ? 'pnpm' : packageManager === 'yarn' ? 'yarn' : 'npm';
  const args = ['run', 'dev'];

  devProcess = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  devProcess.on('exit', (code, signal) => {
    log(`⚠️  Dev server exited with code ${code}${signal ? `, signal ${signal}` : ''}`);
    devProcess = null;
    isStarting = false;
    
    // If it exited unexpectedly, restart it
    if (code !== 0 && code !== null) {
      log('🔄 Restarting dev server in 2 seconds...');
      setTimeout(() => {
        startDevServer();
      }, 2000);
    }
  });

  devProcess.on('error', (error) => {
    log(`❌ Failed to start dev server: ${error.message}`);
    devProcess = null;
    isStarting = false;
  });

  // Wait for startup before starting health checks
  setTimeout(() => {
    isStarting = false;
    log('✅ Dev server startup complete, beginning health checks...');
  }, STARTUP_TIMEOUT);
}

function stopDevServer() {
  if (devProcess) {
    log('🛑 Stopping dev server...');
    devProcess.kill('SIGTERM');
    devProcess = null;
  }
}

async function performHealthCheck() {
  if (isStarting) {
    return; // Skip health checks during startup
  }

  const isHealthy = await checkHealth();
  lastHealthCheck = new Date();

  if (isHealthy) {
    if (failureCount > 0) {
      log('✅ Server is healthy again');
    }
    failureCount = 0;
  } else {
    failureCount++;
    log(`⚠️  Health check failed (${failureCount}/${MAX_FAILURES})`);

    if (failureCount >= MAX_FAILURES) {
      log('❌ Server is unhealthy, restarting...');
      failureCount = 0;
      stopDevServer();
      setTimeout(() => {
        startDevServer();
      }, 2000);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Shutting down monitor...');
  stopDevServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Shutting down monitor...');
  stopDevServer();
  process.exit(0);
});

// Start the dev server
startDevServer();

// Begin health checks after initial startup period
setTimeout(() => {
  setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL);
  log('📊 Health monitoring started');
}, STARTUP_TIMEOUT + 2000);

// Log status every minute
setInterval(() => {
  if (devProcess && !isStarting) {
    const status = failureCount > 0 ? `⚠️  (${failureCount} failures)` : '✅';
    const lastCheck = lastHealthCheck 
      ? `Last check: ${lastHealthCheck.toLocaleTimeString()}`
      : 'Waiting for first check...';
    log(`Status: ${status} | ${lastCheck}`);
  }
}, 60000);

log('👀 Monitor started. Press Ctrl+C to stop.');

