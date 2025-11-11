/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-puppeteer',
  testEnvironment: 'node',
  testMatch: process.env.JEST_FAILPACK
    ? ['**/tests/ui/failpack/**/*.spec.ts']
    : process.env.LIVE_LLM === '1'
    ? ['**/tests/ui/**/*.spec.ts', '!**/tests/ui/failpack/**/*.spec.ts']
    : ['**/tests/ui/**/*.spec.ts', '!**/tests/ui/failpack/**/*.spec.ts', '!**/tests/ui/chat.live.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests serially for stability
  globals: {
    UI_ARTIFACT_DIR: process.env.UI_ARTIFACT_DIR || 'artifacts/ui-test',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};

