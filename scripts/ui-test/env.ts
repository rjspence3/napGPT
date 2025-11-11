/**
 * Environment variable loader and defaults
 */

export interface TestEnv {
  baseUrl: string;
  headful: boolean;
  liveLLM: boolean;
  modelMatrix: string | undefined;
  chaosLatencyMs: number;
  chaosFailPct: number;
  chaos429Pct: number;
  testSeed: number;
  disableDreamDrift: boolean;
  disableSheep: boolean;
  mcpDriver: 'puppeteer' | 'server';
  maxRequests: number;
  maxTokens: number;
}

/**
 * Load and validate environment variables
 */
export function loadEnv(): TestEnv {
  return {
    baseUrl: process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3000',
    headful: process.env.HEADFUL === '1' || process.env.HEADFUL === 'true',
    liveLLM: process.env.LIVE_LLM === '1' || process.env.LIVE_LLM === 'true',
    modelMatrix: process.env.MODEL_MATRIX,
    chaosLatencyMs: parseInt(process.env.CHAOS_LATENCY_MS || '0', 10),
    chaosFailPct: parseInt(process.env.CHAOS_FAIL_PCT || '0', 10),
    chaos429Pct: parseInt(process.env.CHAOS_429_PCT || '0', 10),
    testSeed: parseInt(process.env.NAPGPT_TEST_SEED || process.env.TEST_SEED || '1337', 10),
    disableDreamDrift: process.env.NAPGPT_DISABLE_DREAM_DRIFT === '1',
    disableSheep: process.env.NAPGPT_DISABLE_SHEEP === '1',
    mcpDriver: (process.env.MCP_DRIVER === 'server' ? 'server' : 'puppeteer') as 'puppeteer' | 'server',
    maxRequests: parseInt(process.env.LLM_MAX_REQUESTS || '10', 10),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '128', 10),
  };
}

/**
 * Validate required env vars for live LLM tests
 */
export function validateLiveLLMEnv(): { valid: boolean; error?: string } {
  if (process.env.LIVE_LLM !== '1') {
    return { valid: false, error: 'LIVE_LLM not set to 1' };
  }

  const provider = process.env.LLM_PROVIDER || 'openai';
  if (!['openai', 'anthropic'].includes(provider)) {
    return { valid: false, error: `Invalid LLM_PROVIDER: ${provider}` };
  }

  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    return { valid: false, error: 'LLM_API_KEY not set or too short' };
  }

  return { valid: true };
}

/**
 * Get env vars as object for child processes
 */
export function getEnvForChildProcess(env: TestEnv): Record<string, string> {
  const result: Record<string, string> = {
    BASE_URL: env.baseUrl,
    HEADFUL: env.headful ? '1' : '0',
    LIVE_LLM: env.liveLLM ? '1' : '0',
    NAPGPT_TEST_SEED: String(env.testSeed),
    LLM_MAX_REQUESTS: String(env.maxRequests),
    LLM_MAX_TOKENS: String(env.maxTokens),
  };

  if (env.modelMatrix) {
    result.MODEL_MATRIX = env.modelMatrix;
  }

  if (env.chaosLatencyMs > 0) {
    result.CHAOS_LATENCY_MS = String(env.chaosLatencyMs);
  }

  if (env.chaosFailPct > 0) {
    result.CHAOS_FAIL_PCT = String(env.chaosFailPct);
  }

  if (env.chaos429Pct > 0) {
    result.CHAOS_429_PCT = String(env.chaos429Pct);
  }

  if (env.disableDreamDrift) {
    result.NAPGPT_DISABLE_DREAM_DRIFT = '1';
  }

  if (env.disableSheep) {
    result.NAPGPT_DISABLE_SHEEP = '1';
  }

  if (env.mcpDriver === 'server') {
    result.MCP_DRIVER = 'server';
  }

  // Pass through LLM secrets if present
  if (process.env.LLM_API_KEY) {
    result.LLM_API_KEY = process.env.LLM_API_KEY;
  }

  if (process.env.LLM_PROVIDER) {
    result.LLM_PROVIDER = process.env.LLM_PROVIDER;
  }

  if (process.env.LLM_MODEL) {
    result.LLM_MODEL = process.env.LLM_MODEL;
  }

  return result;
}

