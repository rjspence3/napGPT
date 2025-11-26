import {
    WakeReactionProcessor,
    SelfReferenceProcessor,
    DropoutProcessor,
    NonSequiturProcessor,
    SleepySignOffProcessor,
    DreamDriftProcessor,
    EchoFragmentProcessor,
    TruncationProcessor,
} from "./processors";
import { PipelineContext } from "./types";
import * as testRandom from "@/lib/utils/testRandom";

// Mock dependencies manually
const mocks = {
    testRandomVal: 0.1,
};

// Override getTestRandom
testRandom.setTestRandomGenerator(() => mocks.testRandomVal);

// Mock utils
const utils = {
    safeTruncate: (s: string, l: number) => s.substring(0, l),
    splitOnPunctuation: (s: string) => [s],
    detectWakeKeywords: (s: string) => s.includes("wake"),
    lazinessCurve: (e: number) => e / 100,
};

// Simple test runner
async function runTests() {
    console.log("🚀 Running Pipeline Tests...\n");
    let passed = 0;
    let failed = 0;

    function describe(name: string, fn: () => void) {
        console.log(`\n[${name}]`);
        fn();
    }

    function it(name: string, fn: () => void) {
        try {
            fn();
            console.log(`  ✅ ${name}`);
            passed++;
        } catch (e: any) {
            console.log(`  ❌ ${name}`);
            console.error(`     Error: ${e.message}`);
            failed++;
        }
    }

    function expect(actual: any) {
        return {
            toBe: (expected: any) => {
                if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
            },
            toContain: (expected: any) => {
                if (!actual.includes(expected)) throw new Error(`Expected ${actual} to contain ${expected}`);
            },
            toBeLessThanOrEqual: (expected: number) => {
                if (actual > expected) throw new Error(`Expected ${actual} <= ${expected}`);
            },
        };
    }

    // Setup context
    let context: PipelineContext = {
        effort: 50,
        isDreaming: false,
        isNapping: false,
        intent: "general",
        config: {
            ENABLE_WAKE_REACTIONS: true,
            ALLOW_SELF_REFERENCES: true,
            SELF_REF_PROB: 0.5,
            ENABLE_LAZINESS_CURVE: true,
            DREAM_DRIFT_PROB: 0.5,
            ENABLE_DRIFT_BLEND: false,
            ENABLE_ECHO_FRAGMENTS: true,
            ECHO_FRAGMENT_PROB: 0.5,
        },
        testConfig: {},
        metadata: {
            gaveUp: false,
            nonSequitur: false,
            strategy: "lazy-help",
        },
        band: {
            dropout: 0.5,
            nonseq: 0.5,
            maxTokens: 100,
        },
        history: [],
    };

    // Run tests
    describe("WakeReactionProcessor", () => {
        it("should prepend wake reaction if keywords detected", () => {
            context.history = [{ role: "user", content: "wake me up" }];
            // We need to mock detectWakeKeywords behavior or rely on real one if imported
            // Since we can't easily mock imported modules in tsx without a loader, 
            // we'll rely on the fact that we imported the real processors which import real utils.
            // But wait, the real utils are imported in processors.ts. 
            // We can't mock them easily here.
            // However, detectWakeKeywords is simple enough to work with real logic.
            // "wake" is in the keyword list in utils.ts? Let's check.
            // Yes, "motivate me", "urgent", "deadline", "important", "please help".
            // "wake" is NOT in the list. "urgent" is.

            context.history = [{ role: "user", content: "this is urgent" }];
            const processor = new WakeReactionProcessor();
            // We also need to mock WAKE_REACTIONS. 
            // Since we can't mock the import, we rely on the real one.
            // Real WAKE_REACTIONS are random.
            // This makes testing hard without mocks.

            // Strategy: Check if the output length > input length, implying something was added.
            const result = processor.process("Hello", context);
            if (result.length <= 5) throw new Error("Wake reaction not added");
        });

        it("should not prepend if no keywords", () => {
            context.history = [{ role: "user", content: "hello" }];
            const processor = new WakeReactionProcessor();
            const result = processor.process("Hello", context);
            expect(result).toBe("Hello");
        });
    });

    describe("SelfReferenceProcessor", () => {
        it("should add self reference if probability met", () => {
            mocks.testRandomVal = 0.1; // < 0.5
            const processor = new SelfReferenceProcessor();
            const result = processor.process("Hello world", context);
            // Again, real implementation uses renderSelfRef.
            if (result === "Hello world") throw new Error("Self ref not added");
        });

        it("should not add self reference if probability not met", () => {
            mocks.testRandomVal = 0.9; // > 0.5
            const processor = new SelfReferenceProcessor();
            const result = processor.process("Hello world", context);
            expect(result).toBe("Hello world");
        });
    });

    describe("DropoutProcessor", () => {
        it("should truncate if probability met", () => {
            mocks.testRandomVal = 0.1;
            const processor = new DropoutProcessor();
            const longText = "This is a very long text that should be truncated because it is too long for the effort level.";
            const result = processor.process(longText, context);
            expect(result).toContain("… zzz");
            if (!context.metadata.gaveUp) throw new Error("gaveUp metadata not set");
        });

        it("should not truncate short text", () => {
            mocks.testRandomVal = 0.1;
            const processor = new DropoutProcessor();
            const shortText = "Short text";
            const result = processor.process(shortText, context);
            expect(result).toBe(shortText);
        });
    });

    describe("TruncationProcessor", () => {
        it("should truncate based on effort level", () => {
            context.effort = 10; // Low effort -> max 120 chars
            const processor = new TruncationProcessor();
            const longText = "a".repeat(200);
            const result = processor.process(longText, context);
            expect(result.length).toBeLessThanOrEqual(123); // 120 + "..."
        });

        it("should ensure minimum length", () => {
            const processor = new TruncationProcessor();
            const result = processor.process("", context);
            expect(result).toBe("meh… too tired for that right now.");
        });
    });

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
