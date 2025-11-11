module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 60000,
      numberOfRuns: 3,
      // Simulate CPU throttling in CI for perf drop detection
      ...(process.env.CI && {
        throttling: {
          cpuSlowdownMultiplier: 4,
        },
      }),
    },
    assert: {
      assertions: {
        // Documented thresholds: Performance ≥ 70, Accessibility ≥ 90, Best Practices ≥ 90
        'categories:performance': ['error', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './artifacts/lighthouse',
    },
  },
};

