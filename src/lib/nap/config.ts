/**
 * Configuration and feature flags for NapGPT prompt system
 * All features are gated by environment variables with safe defaults
 */
import { isTestMode } from "@/lib/utils/env";

/**
 * Helper to parse boolean environment variables
 * @param envKey - The environment variable key
 * @param defaultValue - Fallback value if env var is undefined
 * @returns Parsed boolean value or default
 */
function bool(envKey: string, defaultValue: boolean): boolean {
  const val = process.env[envKey];
  if (val === undefined) return defaultValue;
  return val === "1" || val === "true" || val === "yes";
}

/**
 * Helper to parse numeric environment variables
 * @param envKey - The environment variable key
 * @param defaultValue - Fallback value if env var is undefined or invalid
 * @returns Parsed number or default
 */
function num(envKey: string, defaultValue: number): number {
  const val = process.env[envKey];
  if (val === undefined) return defaultValue;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultValue : parsed;
}

export interface NapConfig {
  /** Enables micro-modes for varied personality responses */
  ENABLE_MICRO_MODES: boolean;
  /** Allows the model to refer to itself in the third person or meta-commentary */
  ALLOW_SELF_REFERENCES: boolean;
  /** Enables the laziness curve where effort decreases over time/turns */
  ENABLE_LAZINESS_CURVE: boolean;
  /** Enables echoing fragments of the user's input back to them */
  ENABLE_ECHO_FRAGMENTS: boolean;
  /** Enables rich refusals where the model creatively declines tasks */
  ENABLE_RICH_REFUSALS: boolean;
  /** Enables blending of dream-like content into responses */
  ENABLE_DRIFT_BLEND: boolean;
  /** Enables special reactions when "waking up" from low effort */
  ENABLE_WAKE_REACTIONS: boolean;
  /** Enables dynamic stopping where the model cuts off mid-sentence */
  ENABLE_DYNAMIC_STOPS: boolean;
  /** Enables the /recall command to inspect memory */
  ENABLE_RECALL_COMMAND: boolean;
  /** Enables rare "lucid moments" where NapGPT wakes up and answers genuinely */
  ENABLE_LUCID_MOMENTS: boolean;

  /** Probability (0-1) of dream drift occurring */
  DREAM_DRIFT_PROB: number;
  /** Probability (0-1) of self-reference occurring */
  SELF_REF_PROB: number;
  /** Probability (0-1) of echoing a fragment */
  ECHO_FRAGMENT_PROB: number;
  /** Ratio (0-1) of drift blending vs appending */
  DRIFT_BLEND_RATIO: number;
}

/**
 * Overrides for configuration used in testing
 */
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
  ENABLE_LUCID_MOMENTS?: boolean;
  dreamDriftProb?: number;
  selfRefProb?: number;
  echoFragmentProb?: number;
  driftBlendRatio?: number;
  /** deterministic random function for testing */
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
  // Default on in the real app, off under test so deterministic suites are unaffected.
  ENABLE_LUCID_MOMENTS: bool("NEXT_PUBLIC_NAPGPT_ENABLE_LUCID_MOMENTS", !isTestMode()),

  DREAM_DRIFT_PROB: num("NEXT_PUBLIC_NAPGPT_DREAM_DRIFT_PROB", 0.07),
  SELF_REF_PROB: num("NEXT_PUBLIC_NAPGPT_SELF_REF_PROB", 0.06),
  ECHO_FRAGMENT_PROB: num("NEXT_PUBLIC_NAPGPT_ECHO_FRAGMENT_PROB", 0.08),
  DRIFT_BLEND_RATIO: num("NEXT_PUBLIC_NAPGPT_DRIFT_BLEND_RATIO", 0.2),
};

/**
 * Get config with test overrides applied
 * @param overrides - Optional overrides for testing
 * @returns The final NapConfig object
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
    ...(overrides.ENABLE_LUCID_MOMENTS !== undefined && { ENABLE_LUCID_MOMENTS: overrides.ENABLE_LUCID_MOMENTS }),
    ...(overrides.dreamDriftProb !== undefined && { DREAM_DRIFT_PROB: overrides.dreamDriftProb }),
    ...(overrides.selfRefProb !== undefined && { SELF_REF_PROB: overrides.selfRefProb }),
    ...(overrides.echoFragmentProb !== undefined && { ECHO_FRAGMENT_PROB: overrides.echoFragmentProb }),
    ...(overrides.driftBlendRatio !== undefined && { DRIFT_BLEND_RATIO: overrides.driftBlendRatio }),
  };
}

/**
 * Helper to extract test random function from overrides
 * @param overrides - The test overrides
 * @returns The random function or undefined
 */
export function getTestRandomFn(overrides?: TestConfigOverrides): (() => number) | undefined {
  return overrides?.testRandomFn;
}

