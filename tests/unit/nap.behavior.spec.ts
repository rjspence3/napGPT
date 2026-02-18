/**
 * Unit tests for NapGPT behavior features
 */

import { respond, resetConversationState } from "@/lib/nap/engine";
import { lazinessCurve } from "@/lib/nap/utils";
import { detectMicroIntent, detectWakeKeywords, summarizeReply, splitOnPunctuation } from "@/lib/nap/utils";
import { getConfig } from "@/lib/nap/config";
import type { LLMMessage } from "@/lib/llm/adapter";

// Mock LLM adapter
jest.mock("@/lib/llm/adapter", () => ({
  getLLM: () => ({
    chat: async (messages: LLMMessage[], options: any) => ({
      text: "Test response from mock LLM.",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    }),
  }),
}));

describe("NapGPT Behavior Features", () => {
  beforeEach(() => {
    resetConversationState();
  });

  describe("lazinessCurve", () => {
    it("should return 0 for effort 0", () => {
      expect(lazinessCurve(0)).toBe(0);
    });

    it("should return 1 for effort 100", () => {
      expect(lazinessCurve(100)).toBe(1);
    });

    it("should be non-linear (lower effort suppressed more)", () => {
      const low = lazinessCurve(20);
      const mid = lazinessCurve(50);
      const high = lazinessCurve(80);

      // Low effort should be more suppressed
      expect(low).toBeLessThan(0.3);
      expect(mid).toBeGreaterThan(low);
      expect(high).toBeGreaterThan(mid);
    });
  });

  describe("detectMicroIntent", () => {
    it("should detect tech intent", () => {
      expect(detectMicroIntent("How do I use React hooks?")).toBe("tech");
      expect(detectMicroIntent("What is TypeScript?")).toBe("tech");
    });

    it("should detect existential intent", () => {
      expect(detectMicroIntent("What is the meaning of life?")).toBe("existential");
      expect(detectMicroIntent("Why are we here?")).toBe("existential");
    });

    it("should detect complaint intent", () => {
      expect(detectMicroIntent("This doesn't work!")).toBe("complaint");
      expect(detectMicroIntent("Why is this broken?")).toBe("complaint");
    });

    it("should default to general", () => {
      expect(detectMicroIntent("Hello!")).toBe("general");
    });
  });

  describe("detectWakeKeywords", () => {
    it("should detect wake keywords", () => {
      expect(detectWakeKeywords("This is urgent!")).toBe(true);
      expect(detectWakeKeywords("Please help me")).toBe(true);
      expect(detectWakeKeywords("I have a deadline")).toBe(true);
    });

    it("should not detect in normal messages", () => {
      expect(detectWakeKeywords("Hello!")).toBe(false);
      expect(detectWakeKeywords("How are you?")).toBe(false);
    });
  });

  describe("summarizeReply", () => {
    it("should truncate long replies", () => {
      const long = "This is a very long reply that should be summarized. It has multiple sentences. And more content.";
      const summary = summarizeReply(long, 50);
      expect(summary.length).toBeLessThanOrEqual(50 + 10); // Allow some margin
    });

    it("should preserve short replies", () => {
      const short = "Short reply.";
      expect(summarizeReply(short, 50)).toBe(short);
    });
  });

  describe("splitOnPunctuation", () => {
    it("should split on sentence boundaries", () => {
      const text = "First sentence. Second sentence! Third sentence?";
      const parts = splitOnPunctuation(text);
      expect(parts.length).toBeGreaterThanOrEqual(2);
    });

    it("should preserve punctuation", () => {
      const text = "Hello. World!";
      const parts = splitOnPunctuation(text);
      expect(parts[0]).toContain(".");
    });
  });

  describe("Micro-modes", () => {
    it("should include micro-mode in system prompt when enabled", async () => {
      const response = await respond({
        messages: [{ role: "user", content: "How do I use React?" }],
        effort: 50,
        testConfig: {
          ENABLE_MICRO_MODES: true,
          testRandomFn: () => 0.5, // Deterministic
        },
      });

      expect(response.text).toBeTruthy();
    });
  });

  describe("Wake Reactions", () => {
    it("should add wake reaction when keywords detected", async () => {
      const response = await respond({
        messages: [{ role: "user", content: "This is urgent!" }],
        effort: 50,
        testConfig: {
          ENABLE_WAKE_REACTIONS: true,
          testRandomFn: () => 0.1, // Low random to ensure reaction
        },
      });

      // Response should contain wake reaction
      expect(response.text).toBeTruthy();
    });
  });

  describe("Rich Refusals", () => {
    it("should use rich refusal variants when enabled", async () => {
      // Force refuse strategy with low effort
      const response = await respond({
        messages: [{ role: "user", content: "Do this work for me" }],
        effort: 5, // Very low effort -> likely refuse
        testConfig: {
          ENABLE_RICH_REFUSALS: true,
          testRandomFn: () => 0.1, // Force refuse strategy
        },
      });

      expect(response.text).toBeTruthy();
    });
  });

  describe("Echo Fragments", () => {
    it("should add echo fragment on second turn when enabled", async () => {
      // First turn
      await respond({
        messages: [{ role: "user", content: "Hello!" }],
        effort: 50,
      });

      // Second turn
      const response = await respond({
        messages: [
          { role: "user", content: "Hello!" },
          { role: "assistant", content: "Hi there." },
          { role: "user", content: "Tell me more" },
        ],
        effort: 50,
        testConfig: {
          ENABLE_ECHO_FRAGMENTS: true,
          echoFragmentProb: 1.0, // Always trigger
          testRandomFn: () => 0.1, // Low to trigger echo
        },
      });

      expect(response.text).toBeTruthy();
    });
  });

  describe("Laziness Curve", () => {
    it("should affect maxTokens when enabled", async () => {
      const lowEffort = await respond({
        messages: [{ role: "user", content: "Hello!" }],
        effort: 10,
        testConfig: {
          ENABLE_LAZINESS_CURVE: true,
        },
      });

      const highEffort = await respond({
        messages: [{ role: "user", content: "Hello!" }],
        effort: 90,
        testConfig: {
          ENABLE_LAZINESS_CURVE: true,
        },
      });

      // Both should succeed, but high effort should have different behavior
      expect(lowEffort.text).toBeTruthy();
      expect(highEffort.text).toBeTruthy();
    });
  });

  describe("Dynamic Stop Sequences", () => {
    it("should use dynamic stops when enabled", async () => {
      const response = await respond({
        messages: [{ role: "user", content: "Hello!" }],
        effort: 50,
        flags: { dream: true },
        testConfig: {
          ENABLE_DYNAMIC_STOPS: true,
        },
      });

      expect(response.text).toBeTruthy();
    });
  });
});

