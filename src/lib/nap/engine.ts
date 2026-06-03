import { getLLM } from "../llm/adapter";
import type { LLMMessage } from "../llm/adapter";
import {
  pickWeighted,
  safeTruncate,
  detectWakeKeywords,
  detectMicroIntent,
  splitOnPunctuation,
  lazinessCurve,
  type MicroIntent,
} from "./utils";
import { getTestRandom } from "@/lib/utils/testRandom";
import { classifyIntent, type Intent } from "./intent";
import { getConfig, type TestConfigOverrides } from "./config";
import {
  BASE_PROMPTS,
  STRATEGY_TONES,
  MICRO_MODES,
  FALLBACK_MESSAGES,
  REFUSAL_VARIANTS,
  renderSelfRef,
  stopSequences,
} from "./prompts";
import { resetConversationState } from "./conversation-state";
import { preprocessCommands } from "./utils";
import { PipelineContext, Processor } from "./pipeline/types";
import {
  WakeReactionProcessor,
  SelfReferenceProcessor,
  DropoutProcessor,
  NonSequiturProcessor,
  SleepySignOffProcessor,
  DreamDriftProcessor,
  EchoFragmentProcessor,
  TruncationProcessor,
} from "./pipeline/processors";

/**
 * Response object returned by the NapGPT engine
 */
export interface NapResponse {
  /** The generated text response */
  text: string;
  /** Metadata about the generation process */
  meta: {
    /** The strategy used (refuse, one-liner, etc.) */
    strategy: string;
    /** The effort level used for generation */
    effort: number;
    /** The detected user intent */
    intent: Intent;
    /** Whether the model "gave up" mid-response */
    gaveUp: boolean;
    /** Whether a non-sequitur was added */
    nonSequitur: boolean;
    /** Whether this was a rare "lucid moment" — a genuine, full answer */
    lucid: boolean;
  };
  /** Token usage statistics if available */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Options for generating a response
 */
export interface NapOptions {
  /** The conversation history */
  messages: LLMMessage[];
  /** Current effort level (0-100) */
  effort: number;
  /** Temporary effort boost from wake words */
  wakeBoost?: number;
  /** Feature flags for this specific generation */
  flags?: {
    /** Whether to use dream mode */
    dream?: boolean;
  };
  /** Configuration overrides for testing */
  testConfig?: TestConfigOverrides;
}

type Strategy = "refuse" | "one-liner" | "lazy-help" | "full-help";

interface BandConfig {
  min: number;
  max: number;
  weights: Record<Strategy, number>;
  maxTokens: number;
  dropout: number;
  nonseq: number;
}

const BAND_TABLE: BandConfig[] = [
  {
    min: 0,
    max: 15,
    weights: { refuse: 0.85, "one-liner": 0.15, "lazy-help": 0, "full-help": 0 },
    maxTokens: 24,
    dropout: 0.25,
    nonseq: 0.05,
  },
  {
    min: 16,
    max: 35,
    weights: { refuse: 0.2, "one-liner": 0.6, "lazy-help": 0.2, "full-help": 0 },
    maxTokens: 60,
    dropout: 0.15,
    nonseq: 0.08,
  },
  {
    min: 36,
    max: 85,
    weights: { refuse: 0, "one-liner": 0.25, "lazy-help": 0.6, "full-help": 0.15 },
    maxTokens: 160,
    dropout: 0.12,
    nonseq: 0.10,
  },
  {
    min: 86,
    max: 100,
    weights: { refuse: 0, "one-liner": 0.1, "lazy-help": 0.35, "full-help": 0.55 },
    maxTokens: 360,
    dropout: 0.04,
    nonseq: 0.05,
  },
];

function bandFor(effort: number): BandConfig {
  const band = BAND_TABLE.find((b) => effort >= b.min && effort <= b.max);
  return band || BAND_TABLE[BAND_TABLE.length - 1];
}

// "Lucid moment" tuning: below LUCID_MIN_EFFORT NapGPT never wakes up; the
// chance ramps linearly to LUCID_MAX_CHANCE at effort 100.
const LUCID_MIN_EFFORT = 16;
const LUCID_MAX_CHANCE = 0.4;
const LUCID_MAX_TOKENS = 512;
const LUCID_TEMPERATURE = 0.5;

function lucidChance(effort: number): number {
  if (effort < LUCID_MIN_EFFORT) return 0;
  return ((effort - LUCID_MIN_EFFORT) / (100 - LUCID_MIN_EFFORT)) * LUCID_MAX_CHANCE;
}

function buildSystemPrompt({
  effort,
  dream,
  strategy,
  microIntent,
  config,
  lucid,
}: {
  effort: number;
  dream: boolean;
  strategy: Strategy;
  microIntent: MicroIntent;
  config: ReturnType<typeof getConfig>;
  lucid: boolean;
}): string {
  // A lucid moment overrides the sleepy persona entirely — answer for real.
  if (lucid) {
    return [BASE_PROMPTS.lucid, `Effort:${effort}.`].join("\n");
  }

  const base = dream ? BASE_PROMPTS.dream : BASE_PROMPTS.normal;
  const tone = STRATEGY_TONES[strategy];
  const effortLine = `Effort:${effort}.`;

  const parts = [base, effortLine, tone];

  // Add micro-mode if enabled and not general
  if (config.ENABLE_MICRO_MODES && microIntent !== "general") {
    const microMode = MICRO_MODES[microIntent];
    if (microMode) {
      parts.push(microMode);
    }
  }

  return parts.join("\n");
}

function fallbackLine(strategy: Strategy, intent: Intent, config: ReturnType<typeof getConfig>): string {
  // Use rich refusal variants if enabled
  if (strategy === "refuse" && config.ENABLE_RICH_REFUSALS) {
    const variant = REFUSAL_VARIANTS[Math.floor(getTestRandom() * REFUSAL_VARIANTS.length)];
    return variant;
  }

  // Fallback to original messages
  if (intent === "math") return FALLBACK_MESSAGES.math;
  if (intent === "code") return FALLBACK_MESSAGES.code;
  if (strategy === "refuse") return FALLBACK_MESSAGES.refuse;
  if (strategy === "one-liner") return FALLBACK_MESSAGES["one-liner"];
  return FALLBACK_MESSAGES.default;
}

/**
 * Main response generation function for NapGPT
 * 
 * Handles effort-based response generation with various strategies:
 * - Refuse: Low effort responses that decline to help
 * - One-liner: Very brief responses
 * - Lazy-help: Moderate effort responses with some detail
 * - Full-help: High effort comprehensive responses
 * 
 * Applies various post-processing effects via a pipeline:
 * - Wake reactions
 * - Self-references
 * - Dropout
 * - Non-sequiturs
 * - Dream drift
 * - Echo fragments
 * - Truncation
 * 
 * @param options - Configuration for response generation
 * @returns Promise resolving to NapResponse with text and metadata
 */
export async function respond(options: NapOptions): Promise<NapResponse> {
  const { messages, effort: baseEffort, wakeBoost = 0, flags = {}, testConfig = {} } = options;

  // Get configuration with test overrides
  const config = getConfig(testConfig);

  // Preprocess commands (handles /nap, /dream)
  const { messages: processedMessages, flags: commandFlags } = preprocessCommands(messages);

  // If command was intercepted (e.g., /nap), return early
  if (commandFlags.intercepted) {
    const lastMsg = processedMessages[processedMessages.length - 1];
    return {
      text: lastMsg?.content || "",
      meta: {
        strategy: "command",
        effort: baseEffort,
        intent: "general",
        gaveUp: false,
        nonSequitur: false,
        lucid: false,
      },
      usage: undefined,
    };
  }

  // Merge command flags
  const mergedFlags = { ...flags, ...commandFlags };

  // Apply wake boost
  let effectiveEffort = baseEffort + wakeBoost;
  const lastUserMessage = processedMessages
    .filter((m) => m.role === "user")
    .pop()?.content || "";

  const hasWakeKeywords = lastUserMessage && detectWakeKeywords(lastUserMessage);
  if (hasWakeKeywords) {
    effectiveEffort = Math.min(100, effectiveEffort + 15);
  }

  effectiveEffort = Math.max(0, Math.min(100, effectiveEffort));

  // Get band configuration
  const band = bandFor(effectiveEffort);
  const intent = classifyIntent(processedMessages);
  const microIntent = detectMicroIntent(lastUserMessage);

  // Rare "lucid moment": NapGPT snaps awake and answers for real. Chance scales
  // with effort. Guarded so that when disabled (e.g. under test) we draw no
  // random number and the strategy stream is identical to before.
  const isLucid =
    config.ENABLE_LUCID_MOMENTS &&
    !mergedFlags.dream &&
    getTestRandom() < lucidChance(effectiveEffort);

  // Select strategy using weighted random; a lucid moment forces full help.
  const strategy: Strategy = isLucid
    ? "full-help"
    : pickWeighted<Strategy>(band.weights);

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    effort: effectiveEffort,
    dream: !!mergedFlags.dream,
    strategy,
    microIntent,
    config,
    lucid: isLucid,
  });

  const llmMessages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...processedMessages,
  ];

  // Determine temperature based on strategy; lucid answers run cooler for accuracy.
  const temperature = isLucid
    ? LUCID_TEMPERATURE
    : strategy === "full-help"
    ? 0.7
    : strategy === "lazy-help"
    ? 0.9
    : 1.1;

  // Get stop sequences
  const stops = stopSequences({
    dream: !!mergedFlags.dream,
    strategy,
    enableDynamic: config.ENABLE_DYNAMIC_STOPS,
  });

  // Call LLM with timeout
  const llm = getLLM();
  let text = "";
  let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

  try {
    // Adjust maxTokens based on laziness curve if enabled. A lucid moment gets a
    // generous, fixed budget so the genuine answer isn't clipped.
    let maxTokens = band.maxTokens;
    if (isLucid) {
      maxTokens = LUCID_MAX_TOKENS;
    } else if (config.ENABLE_LAZINESS_CURVE) {
      const curve = lazinessCurve(effectiveEffort);
      maxTokens = Math.floor(band.maxTokens * curve);
      maxTokens = Math.max(24, maxTokens); // Minimum tokens
    }

    const response = await llm.chat(llmMessages, {
      effort: effectiveEffort,
      maxTokens,
      dream: mergedFlags.dream,
      timeoutMs: 8000,
      temperature,
      stop: stops,
    });
    text = response.text?.trim() ?? "";
    usage = response.usage;
  } catch (error) {
    console.error("LLM call failed:", error);
    text = ""; // handled below
  }

  // Guaranteed minimum content
  if (!text || text.length === 0) {
    text = fallbackLine(strategy, intent, config);
  }

  // --- PIPELINE EXECUTION ---

  const context: PipelineContext = {
    effort: effectiveEffort,
    isDreaming: !!mergedFlags.dream,
    isNapping: false, // Not used in current processors
    intent,
    config,
    testConfig,
    metadata: {
      gaveUp: false,
      nonSequitur: false,
      strategy,
    },
    band,
    history: processedMessages,
  };

  // Skip the degradation pipeline on a lucid moment — those processors exist to
  // lazify/truncate output, which would undo the genuine answer.
  const processors: Processor[] = isLucid
    ? []
    : [
        new WakeReactionProcessor(),
        new SelfReferenceProcessor(),
        new DropoutProcessor(),
        new NonSequiturProcessor(),
        new SleepySignOffProcessor(),
        new DreamDriftProcessor(),
        new EchoFragmentProcessor(),
        new TruncationProcessor(),
      ];

  for (const processor of processors) {
    text = processor.process(text, context);
  }

  return {
    text,
    meta: {
      strategy,
      effort: effectiveEffort,
      intent,
      gaveUp: context.metadata.gaveUp,
      nonSequitur: context.metadata.nonSequitur,
      lucid: isLucid,
    },
    usage,
  };
}

// Export test utilities
export { resetConversationState };
