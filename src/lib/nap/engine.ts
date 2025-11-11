import { getLLM } from "../llm/adapter";
import type { LLMMessage } from "../llm/adapter";
import {
  pickWeighted,
  safeTruncate,
  detectWakeKeywords,
  detectMicroIntent,
  summarizeReply,
  splitOnPunctuation,
  testRandom,
  setTestRandom,
  type MicroIntent,
} from "./utils";
import { classifyIntent, type Intent } from "./intent";
import { getConfig, type TestConfigOverrides } from "./config";
import {
  BASE_PROMPTS,
  STRATEGY_TONES,
  MICRO_MODES,
  FALLBACK_MESSAGES,
  REFUSAL_VARIANTS,
  DRIFT_FRAGMENTS,
  WAKE_REACTIONS,
  ECHO_FRAGMENTS,
  SELF_REFERENCES,
  renderSelfRef,
  stopSequences,
  RECALL_TEMPLATE,
  RECALL_NO_MEMORY,
} from "./prompts";
import {
  updateConversationState,
  getLastReply,
  isFirstTurn,
  resetConversationState,
} from "./conversation-state";
import { preprocessCommands } from "./utils";

export interface NapResponse {
  text: string;
  meta: {
    strategy: string;
    effort: number;
    intent: Intent;
    gaveUp: boolean;
    nonSequitur: boolean;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface NapOptions {
  messages: LLMMessage[];
  effort: number;
  wakeBoost?: number;
  flags?: {
    dream?: boolean;
  };
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

/**
 * Non-linear laziness curve
 * Lower effort suppresses length sharply, high effort ramps quickly
 */
export function lazinessCurve(effort: number): number {
  // S-curve: y = (effort/100)^1.7
  const y = Math.pow(effort / 100, 1.7);
  return Math.min(1, Math.max(0, y));
}

function buildSystemPrompt({
  effort,
  dream,
  strategy,
  microIntent,
  config,
}: {
  effort: number;
  dream: boolean;
  strategy: Strategy;
  microIntent: MicroIntent;
  config: ReturnType<typeof getConfig>;
}): string {
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
    const variant = REFUSAL_VARIANTS[Math.floor(testRandom() * REFUSAL_VARIANTS.length)];
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
 * Handle /recall command
 */
function handleRecallCommand(): string {
  const lastReply = getLastReply();
  if (lastReply) {
    const summary = summarizeReply(lastReply);
    return RECALL_TEMPLATE.replace("{summary}", summary);
  }
  return RECALL_NO_MEMORY;
}

export async function respond(options: NapOptions): Promise<NapResponse> {
  const { messages, effort: baseEffort, wakeBoost = 0, flags = {}, testConfig = {} } = options;

  // Get configuration with test overrides
  const config = getConfig(testConfig);

  // Set test RNG if provided
  if (testConfig?.testRandomFn) {
    setTestRandom(testConfig.testRandomFn);
  }

  // Check for /recall command first
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    const content = lastMessage.content.trim().toLowerCase();
    if (config.ENABLE_RECALL_COMMAND && (content === "/recall" || content === "/mumble")) {
      const recallText = handleRecallCommand();
      return {
        text: recallText,
        meta: {
          strategy: "recall",
          effort: baseEffort,
          intent: "general",
          gaveUp: false,
          nonSequitur: false,
        },
        usage: undefined,
      };
    }
  }

  // Preprocess commands (handles /nap, /dream)
  // Note: /recall is handled above, so preprocessCommands won't see it
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

  // Apply laziness curve if enabled
  let adjustedEffort = effectiveEffort;
  if (config.ENABLE_LAZINESS_CURVE) {
    const curve = lazinessCurve(effectiveEffort);
    adjustedEffort = effectiveEffort * curve;
  }

  // Get band configuration (use original effort for band selection)
  const band = bandFor(effectiveEffort);
  const intent = classifyIntent(processedMessages);
  const microIntent = detectMicroIntent(lastUserMessage);

  // Gate non-helpful antics for math/code
  const allowDropout = intent === "general";
  const allowNonSeq = intent === "general" && effectiveEffort < 90;

  // Select strategy using weighted random
  const strategy = pickWeighted<Strategy>(band.weights);

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    effort: effectiveEffort,
    dream: !!mergedFlags.dream,
    strategy,
    microIntent,
    config,
  });

  const llmMessages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...processedMessages,
  ];

  // Determine temperature based on strategy
  const temperature =
    strategy === "full-help" ? 0.7 : strategy === "lazy-help" ? 0.9 : 1.1;

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
    // Adjust maxTokens based on laziness curve if enabled
    let maxTokens = band.maxTokens;
    if (config.ENABLE_LAZINESS_CURVE) {
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

  // Add wake reaction if keywords detected
  if (config.ENABLE_WAKE_REACTIONS && hasWakeKeywords && !mergedFlags.dream) {
    const reaction = WAKE_REACTIONS[Math.floor(testRandom() * WAKE_REACTIONS.length)];
    text = reaction + " " + text;
  }

  // Self-referential humor (low probability)
  if (
    config.ALLOW_SELF_REFERENCES &&
    testRandom() < config.SELF_REF_PROB &&
    intent === "general" &&
    !mergedFlags.dream
  ) {
    const fact = text.substring(0, Math.min(50, text.length));
    text = renderSelfRef(fact, testRandom);
  }

  // Mid-reply dropout (never below min length)
  let gaveUp = false;
  const dropoutProb = config.ENABLE_LAZINESS_CURVE
    ? band.dropout * (1 - lazinessCurve(effectiveEffort))
    : band.dropout;

  if (allowDropout && testRandom() < dropoutProb && text.length > 40) {
    const truncated = safeTruncate(text, 40);
    text = truncated + "… zzz";
    gaveUp = true;
  }

  // Occasional non-sequitur (never for math/code)
  let nonSequitur = false;
  if (allowNonSeq && testRandom() < band.nonseq && !gaveUp) {
    text += " Anyway… pancakes.";
    nonSequitur = true;
  }

  // Sleepy sign-off on full-help high effort
  if (strategy === "full-help" && effectiveEffort >= 86 && !gaveUp) {
    text += " Ok, I'm going back to sleep now.";
  }

  // Dream Drift: append or blend whimsical fragment
  if (!mergedFlags.dream && !gaveUp && intent === "general") {
    const driftProb = testConfig.dreamDriftProb !== undefined ? testConfig.dreamDriftProb : config.DREAM_DRIFT_PROB;

    if (testRandom() < driftProb) {
      const fragment = DRIFT_FRAGMENTS[Math.floor(testRandom() * DRIFT_FRAGMENTS.length)];

      if (config.ENABLE_DRIFT_BLEND && testRandom() < config.DRIFT_BLEND_RATIO) {
        // Mid-sentence blend
        const parts = splitOnPunctuation(text);
        if (parts.length > 1) {
          const insertIndex = Math.floor(testRandom() * (parts.length - 1)) + 1;
          parts.splice(insertIndex, 0, fragment);
          text = parts.join(" ");
        } else {
          // Fallback to append if no good split point
          text += " " + fragment;
        }
      } else {
        // Classic append
        text += " " + fragment;
      }
    }
  }

  // Echo fragment (prior-turn reference)
  if (
    config.ENABLE_ECHO_FRAGMENTS &&
    !isFirstTurn() &&
    testRandom() < config.ECHO_FRAGMENT_PROB &&
    intent === "general" &&
    !gaveUp
  ) {
    const echo = ECHO_FRAGMENTS[Math.floor(testRandom() * ECHO_FRAGMENTS.length)];
    text += " " + echo;
  }

  // Update conversation state
  updateConversationState(text, intent);

  // Reset test RNG
  if (testConfig.testRandomFn) {
    setTestRandom(undefined);
  }

  return {
    text,
    meta: {
      strategy,
      effort: effectiveEffort,
      intent,
      gaveUp,
      nonSequitur,
    },
    usage,
  };
}

// Export test utilities
export { setTestRandom, resetConversationState };
