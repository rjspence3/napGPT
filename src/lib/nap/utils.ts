export function maybeGiveUpMidway(text: string, probability: number = 0.15): string {
  if (Math.random() > probability) return text;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return text + "… zzz";

  const cutoff = Math.floor(Math.random() * sentences.length) + 1;
  const truncated = sentences.slice(0, cutoff).join(". ") + "… zzz";
  return truncated;
}

export function maybeAddNonSequitur(text: string, probability: number = 0.1): string {
  if (Math.random() > probability) return text;

  const nonSequiturs = [
    "anyway… pancakes.",
    "speaking of which, I'm hungry.",
    "wait, what was I saying? oh right.",
    "hmm, I think I left the oven on.",
  ];

  const random = nonSequiturs[Math.floor(Math.random() * nonSequiturs.length)];
  return text + " " + random;
}

export function truncateByTokens(text: string, maxTokens: number): string {
  const words = text.split(/\s+/);
  const estimatedTokens = words.length * 1.3; // rough estimate

  if (estimatedTokens <= maxTokens) return text;

  const targetWords = Math.floor(maxTokens / 1.3);
  return words.slice(0, targetWords).join(" ") + "...";
}

export function detectWakeKeywords(message: string): boolean {
  const keywords = ["motivate me", "urgent", "deadline", "important", "please help"];
  const lower = message.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

/**
 * Detect micro-mode intent for context-aware prompts
 * Returns 'tech' | 'existential' | 'complaint' | 'general'
 */
export type MicroIntent = "tech" | "existential" | "complaint" | "general";

export function detectMicroIntent(message: string): MicroIntent {
  const lower = message.toLowerCase();
  
  // Tech detection: programming, technical terms
  const techPatterns = [
    /\b(react|vue|angular|typescript|javascript|python|java|code|function|api|database|server|client|framework|library|npm|package|git|github|deploy|build|compile|debug|test|unit|integration)\b/,
    /\b(algorithm|data structure|optimization|performance|scalability|architecture|design pattern)\b/,
  ];
  if (techPatterns.some(pattern => pattern.test(lower))) {
    return "tech";
  }
  
  // Existential detection: philosophical, life questions
  const existentialPatterns = [
    /\b(meaning|purpose|life|death|existence|why are we|what is the point|philosophy|existential)\b/,
    /\b(should i|what should|why do|what does it mean|what is life|happiness|sadness|loneliness)\b/,
  ];
  if (existentialPatterns.some(pattern => pattern.test(lower))) {
    return "existential";
  }
  
  // Complaint detection: frustration, problems, negative sentiment
  const complaintPatterns = [
    /\b(broken|doesn't work|not working|error|bug|problem|issue|frustrated|annoyed|hate|sucks|terrible|awful|worst|failed|failure)\b/,
    /\b(why is|why does|why can't|can't figure out|stuck|help me fix|nothing works)\b/,
  ];
  if (complaintPatterns.some(pattern => pattern.test(lower))) {
    return "complaint";
  }
  
  return "general";
}

/**
 * Simple summarization for /recall command
 * Truncates and simplifies the last reply
 */
export function summarizeReply(reply: string, maxLength: number = 80): string {
  if (reply.length <= maxLength) return reply;
  
  // Try to cut at sentence boundary
  const sentences = reply.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    let summary = sentences[0].trim();
    for (let i = 1; i < sentences.length; i++) {
      const candidate = summary + ". " + sentences[i].trim();
      if (candidate.length <= maxLength) {
        summary = candidate;
      } else {
        break;
      }
    }
    if (summary.length > 0) {
      return summary + (summary.endsWith(".") ? "" : ".");
    }
  }
  
  // Fallback: truncate at word boundary
  const words = reply.split(/\s+/);
  let truncated = "";
  for (const word of words) {
    if ((truncated + " " + word).length > maxLength) break;
    truncated += (truncated ? " " : "") + word;
  }
  return truncated + (truncated.length < reply.length ? "..." : "");
}

/**
 * Split text on punctuation for mid-sentence blending
 */
export function splitOnPunctuation(text: string): string[] {
  // Split on sentence boundaries but keep punctuation
  const parts: string[] = [];
  let current = "";
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    current += char;
    
    // Check for sentence-ending punctuation followed by space or end
    if (/[.!?]/.test(char)) {
      const next = text[i + 1];
      if (!next || /\s/.test(next)) {
        parts.push(current.trim());
        current = "";
      }
    }
  }
  
  if (current.trim()) {
    parts.push(current.trim());
  }
  
  return parts.filter(p => p.length > 0);
}

/**
 * Test RNG override support
 * Allows deterministic testing by overriding Math.random
 */
let testRandomFn: (() => number) | null = null;

export function setTestRandom(fn?: () => number): void {
  testRandomFn = fn || null;
}

export function testRandom(): number {
  if (testRandomFn) {
    return testRandomFn();
  }
  return Math.random();
}

/**
 * Weighted random selection
 */
export function pickWeighted<T extends string>(
  weights: Record<T, number>
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = testRandom() * total;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return key;
    }
  }

  // Fallback to first entry
  return entries[0][0];
}

/**
 * Safe truncate - never below minimum length
 */
export function safeTruncate(s: string, min: number): string {
  if (s.length <= min) return s;
  const cut = Math.max(min, Math.floor(s.length * 0.5));
  return s.slice(0, cut).replace(/[\s.,;:-]+$/, "");
}

/**
 * Command preprocessing
 * Handles /nap and /dream commands before LLM call
 * Note: /recall is handled in engine.ts
 */
import type { LLMMessage } from "@/lib/llm/adapter";

export function preprocessCommands(
  messages: LLMMessage[]
): {
  messages: LLMMessage[];
  flags: { intercepted?: boolean; dream?: boolean };
} {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { messages, flags: {} };
  }

  const content = last.content.trim().toLowerCase();

  if (content === "/nap") {
    return {
      messages: [
        ...messages,
        { role: "assistant", content: "… zzz (taking a tiny nap for 5 seconds)" },
      ],
      flags: { intercepted: true },
    };
  }

  if (content === "/dream") {
    return { messages, flags: { dream: true } };
  }

  // /recall or /mumble command is handled in engine.ts, not here
  // This check is just for future extensibility

  return { messages, flags: {} };
}

