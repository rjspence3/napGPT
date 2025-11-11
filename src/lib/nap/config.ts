/**
 * Configuration and feature flags for NapGPT prompt system
 * All features are gated by environment variables with safe defaults
 */

function bool(envKey: string, defaultValue: boolean): boolean {
  const val = process.env[envKey];
  if (val === undefined) return defaultValue;
  return val === "1" || val === "true" || val === "yes";
}

function num(envKey: string, defaultValue: number): number {
  const val = process.env[envKey];
  if (val === undefined) return defaultValue;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultValue : parsed;
}

export interface NapConfig {
  // Feature flags
  ENABLE_MICRO_MODES: boolean;
  ALLOW_SELF_REFERENCES: boolean;
  ENABLE_LAZINESS_CURVE: boolean;
  ENABLE_ECHO_FRAGMENTS: boolean;
  ENABLE_RICH_REFUSALS: boolean;
  ENABLE_DRIFT_BLEND: boolean;
  ENABLE_WAKE_REACTIONS: boolean;
  ENABLE_DYNAMIC_STOPS: boolean;
  ENABLE_RECALL_COMMAND: boolean;
  
  // Probabilities
  DREAM_DRIFT_PROB: number;
  SELF_REF_PROB: number;
  ECHO_FRAGMENT_PROB: number;
  DRIFT_BLEND_RATIO: number; // 0-1, ratio of blend vs append
}

export interface TestConfigOverrides {
  ENABLE_MICRO_MODES?: boolean;
  ALLOW_SELF_REFERENCES?: boolean;
  ENABLE_LAZINESS_CURVE?: boolean;
  ENABLE_ECHO_FRAGMENTS?: boolean;
  ENABLE_RICH_REFUSALS?: boolean;
  ENABLE_DRIFT_BLEND?: boolean;
  ENABLE_WAKE_REACTIONS?: boolean;
  ENABLE_DYNAMIC_STOPS?: boolean;
  ENABLE_RECALL_COMMAND?: boolean;
  dreamDriftProb?: number;
  selfRefProb?: number;
  echoFragmentProb?: number;
  driftBlendRatio?: number;
  testRandomFn?: () => number;
}

// Default configuration
export const cfg: NapConfig = {
  ENABLE_MICRO_MODES: bool("NEXT_PUBLIC_NAPGPT_ENABLE_MICRO_MODES", true),
  ALLOW_SELF_REFERENCES: bool("NEXT_PUBLIC_NAPGPT_ALLOW_SELF_REFERENCES", false),
  ENABLE_LAZINESS_CURVE: bool("NEXT_PUBLIC_NAPGPT_ENABLE_LAZINESS_CURVE", true),
  ENABLE_ECHO_FRAGMENTS: bool("NEXT_PUBLIC_NAPGPT_ENABLE_ECHO_FRAGMENTS", true),
  ENABLE_RICH_REFUSALS: bool("NEXT_PUBLIC_NAPGPT_ENABLE_RICH_REFUSALS", true),
  ENABLE_DRIFT_BLEND: bool("NEXT_PUBLIC_NAPGPT_ENABLE_DRIFT_BLEND", true),
  ENABLE_WAKE_REACTIONS: bool("NEXT_PUBLIC_NAPGPT_ENABLE_WAKE_REACTIONS", true),
  ENABLE_DYNAMIC_STOPS: bool("NEXT_PUBLIC_NAPGPT_ENABLE_DYNAMIC_STOPS", true),
  ENABLE_RECALL_COMMAND: bool("NEXT_PUBLIC_NAPGPT_ENABLE_RECALL_COMMAND", true),
  
  DREAM_DRIFT_PROB: num("NEXT_PUBLIC_NAPGPT_DREAM_DRIFT_PROB", 0.07),
  SELF_REF_PROB: num("NEXT_PUBLIC_NAPGPT_SELF_REF_PROB", 0.06),
  ECHO_FRAGMENT_PROB: num("NEXT_PUBLIC_NAPGPT_ECHO_FRAGMENT_PROB", 0.08),
  DRIFT_BLEND_RATIO: num("NEXT_PUBLIC_NAPGPT_DRIFT_BLEND_RATIO", 0.2),
};

/**
 * Get config with test overrides applied
 */
export function getConfig(overrides?: TestConfigOverrides): NapConfig {
  if (!overrides) return cfg;
  
  return {
    ...cfg,
    ...(overrides.ENABLE_MICRO_MODES !== undefined && { ENABLE_MICRO_MODES: overrides.ENABLE_MICRO_MODES }),
    ...(overrides.ALLOW_SELF_REFERENCES !== undefined && { ALLOW_SELF_REFERENCES: overrides.ALLOW_SELF_REFERENCES }),
    ...(overrides.ENABLE_LAZINESS_CURVE !== undefined && { ENABLE_LAZINESS_CURVE: overrides.ENABLE_LAZINESS_CURVE }),
    ...(overrides.ENABLE_ECHO_FRAGMENTS !== undefined && { ENABLE_ECHO_FRAGMENTS: overrides.ENABLE_ECHO_FRAGMENTS }),
    ...(overrides.ENABLE_RICH_REFUSALS !== undefined && { ENABLE_RICH_REFUSALS: overrides.ENABLE_RICH_REFUSALS }),
    ...(overrides.ENABLE_DRIFT_BLEND !== undefined && { ENABLE_DRIFT_BLEND: overrides.ENABLE_DRIFT_BLEND }),
    ...(overrides.ENABLE_WAKE_REACTIONS !== undefined && { ENABLE_WAKE_REACTIONS: overrides.ENABLE_WAKE_REACTIONS }),
    ...(overrides.ENABLE_DYNAMIC_STOPS !== undefined && { ENABLE_DYNAMIC_STOPS: overrides.ENABLE_DYNAMIC_STOPS }),
    ...(overrides.ENABLE_RECALL_COMMAND !== undefined && { ENABLE_RECALL_COMMAND: overrides.ENABLE_RECALL_COMMAND }),
    ...(overrides.dreamDriftProb !== undefined && { DREAM_DRIFT_PROB: overrides.dreamDriftProb }),
    ...(overrides.selfRefProb !== undefined && { SELF_REF_PROB: overrides.selfRefProb }),
    ...(overrides.echoFragmentProb !== undefined && { ECHO_FRAGMENT_PROB: overrides.echoFragmentProb }),
    ...(overrides.driftBlendRatio !== undefined && { DRIFT_BLEND_RATIO: overrides.driftBlendRatio }),
  };
}

// Export testRandomFn getter for engine.ts
export function getTestRandomFn(overrides?: TestConfigOverrides): (() => number) | undefined {
  return overrides?.testRandomFn;
}

