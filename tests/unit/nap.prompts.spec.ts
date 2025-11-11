/**
 * Unit tests for prompt assembly and templates
 */

import {
  BASE_PROMPTS,
  STRATEGY_TONES,
  MICRO_MODES,
  REFUSAL_VARIANTS,
  WAKE_REACTIONS,
  ECHO_FRAGMENTS,
  DRIFT_FRAGMENTS,
  stopSequences,
  renderSelfRef,
} from "@/lib/nap/prompts";

describe("Prompt Assembly", () => {
  describe("BASE_PROMPTS", () => {
    it("should have normal and dream base prompts", () => {
      expect(BASE_PROMPTS.normal).toContain("NapGPT");
      expect(BASE_PROMPTS.dream).toContain("dream mode");
    });
  });

  describe("STRATEGY_TONES", () => {
    it("should have tones for all strategies", () => {
      expect(STRATEGY_TONES.refuse).toBeDefined();
      expect(STRATEGY_TONES["one-liner"]).toBeDefined();
      expect(STRATEGY_TONES["lazy-help"]).toBeDefined();
      expect(STRATEGY_TONES["full-help"]).toBeDefined();
    });
  });

  describe("MICRO_MODES", () => {
    it("should have micro-modes for tech, existential, complaint", () => {
      expect(MICRO_MODES.tech).toBeDefined();
      expect(MICRO_MODES.existential).toBeDefined();
      expect(MICRO_MODES.complaint).toBeDefined();
      expect(MICRO_MODES.general).toBe("");
    });
  });

  describe("REFUSAL_VARIANTS", () => {
    it("should have multiple refusal variants", () => {
      expect(REFUSAL_VARIANTS.length).toBeGreaterThan(0);
      REFUSAL_VARIANTS.forEach((variant) => {
        expect(variant.length).toBeGreaterThan(10);
      });
    });
  });

  describe("WAKE_REACTIONS", () => {
    it("should have wake reaction templates", () => {
      expect(WAKE_REACTIONS.length).toBeGreaterThan(0);
      WAKE_REACTIONS.forEach((reaction) => {
        expect(reaction.length).toBeGreaterThan(10);
      });
    });
  });

  describe("ECHO_FRAGMENTS", () => {
    it("should have echo fragment templates", () => {
      expect(ECHO_FRAGMENTS.length).toBeGreaterThan(0);
    });
  });

  describe("DRIFT_FRAGMENTS", () => {
    it("should have drift fragment templates", () => {
      expect(DRIFT_FRAGMENTS.length).toBeGreaterThan(0);
    });
  });

  describe("stopSequences", () => {
    it("should return base stops when dynamic disabled", () => {
      const stops = stopSequences({
        dream: false,
        strategy: "refuse",
        enableDynamic: false,
      });
      expect(stops).toContain("\n\nNapGPT:");
      expect(stops).toContain("… zzz");
    });

    it("should add dream-specific stops when enabled", () => {
      const stops = stopSequences({
        dream: true,
        strategy: "refuse",
        enableDynamic: true,
      });
      expect(stops).toContain("— drifting off");
    });

    it("should add refuse-specific stops when enabled", () => {
      const stops = stopSequences({
        dream: false,
        strategy: "refuse",
        enableDynamic: true,
      });
      expect(stops).toContain("…maybe later");
    });
  });

  describe("renderSelfRef", () => {
    it("should replace {fact} placeholder", () => {
      const fact = "React is a library";
      const result = renderSelfRef(fact);
      expect(result).toContain(fact);
      expect(result).not.toContain("{fact}");
    });
  });
});

