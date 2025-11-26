import { getTestRandom } from "@/lib/utils/testRandom";
import {
    safeTruncate,
    splitOnPunctuation,
    detectWakeKeywords,
    lazinessCurve,
} from "../utils";
import {
    WAKE_REACTIONS,
    DRIFT_FRAGMENTS,
    ECHO_FRAGMENTS,
    renderSelfRef,
} from "../prompts";
import { PipelineContext, Processor } from "./types";

export class WakeReactionProcessor implements Processor {
    name = "WakeReaction";

    process(text: string, context: PipelineContext): string {
        const { config, isDreaming, history } = context;
        const lastUserMessage = history
            .filter((m) => m.role === "user")
            .pop()?.content || "";

        const hasWakeKeywords = lastUserMessage && detectWakeKeywords(lastUserMessage);

        if (config.ENABLE_WAKE_REACTIONS && hasWakeKeywords && !isDreaming) {
            const reaction = WAKE_REACTIONS[Math.floor(getTestRandom() * WAKE_REACTIONS.length)];
            return reaction + " " + text;
        }
        return text;
    }
}

export class SelfReferenceProcessor implements Processor {
    name = "SelfReference";

    process(text: string, context: PipelineContext): string {
        const { config, isDreaming, intent } = context;

        if (
            config.ALLOW_SELF_REFERENCES &&
            getTestRandom() < config.SELF_REF_PROB &&
            intent === "general" &&
            !isDreaming
        ) {
            const fact = text.substring(0, Math.min(50, text.length));
            return renderSelfRef(fact, getTestRandom);
        }
        return text;
    }
}

export class DropoutProcessor implements Processor {
    name = "Dropout";

    process(text: string, context: PipelineContext): string {
        const { config, effort, band, intent } = context;

        // Gate non-helpful antics for math/code
        const allowDropout = intent === "general";

        const dropoutProb = config.ENABLE_LAZINESS_CURVE
            ? band.dropout * (1 - lazinessCurve(effort))
            : band.dropout;

        if (allowDropout && getTestRandom() < dropoutProb && text.length > 40) {
            const truncated = safeTruncate(text, 40);
            context.metadata.gaveUp = true;
            return truncated + "… zzz";
        }
        return text;
    }
}

export class NonSequiturProcessor implements Processor {
    name = "NonSequitur";

    process(text: string, context: PipelineContext): string {
        const { effort, band, intent, metadata } = context;

        const allowNonSeq = intent === "general" && effort < 90;

        if (allowNonSeq && getTestRandom() < band.nonseq && !metadata.gaveUp) {
            context.metadata.nonSequitur = true;
            return text + " Anyway… pancakes.";
        }
        return text;
    }
}

export class SleepySignOffProcessor implements Processor {
    name = "SleepySignOff";

    process(text: string, context: PipelineContext): string {
        const { effort, metadata } = context;
        const { strategy } = metadata;

        if (strategy === "full-help" && effort >= 86 && !metadata.gaveUp) {
            return text + " Ok, I'm going back to sleep now.";
        }
        return text;
    }
}

export class DreamDriftProcessor implements Processor {
    name = "DreamDrift";

    process(text: string, context: PipelineContext): string {
        const { config, testConfig, isDreaming, intent, metadata } = context;

        if (!isDreaming && !metadata.gaveUp && intent === "general") {
            const driftProb = testConfig.dreamDriftProb !== undefined ? testConfig.dreamDriftProb : config.DREAM_DRIFT_PROB;

            if (getTestRandom() < driftProb) {
                const fragment = DRIFT_FRAGMENTS[Math.floor(getTestRandom() * DRIFT_FRAGMENTS.length)];

                if (config.ENABLE_DRIFT_BLEND && getTestRandom() < config.DRIFT_BLEND_RATIO) {
                    // Mid-sentence blend
                    const parts = splitOnPunctuation(text);
                    if (parts.length > 1) {
                        const insertIndex = Math.floor(getTestRandom() * (parts.length - 1)) + 1;
                        parts.splice(insertIndex, 0, fragment);
                        return parts.join(" ");
                    } else {
                        // Fallback to append if no good split point
                        return text + " " + fragment;
                    }
                } else {
                    // Classic append
                    return text + " " + fragment;
                }
            }
        }
        return text;
    }
}

export class EchoFragmentProcessor implements Processor {
    name = "EchoFragment";

    process(text: string, context: PipelineContext): string {
        const { config, intent, metadata, history } = context;

        // Check if it's first turn (history has only 1 user message or less)
        // Actually engine.ts uses isFirstTurn() from conversation-state, but we can infer from history
        // But wait, history in context might be just the messages passed to respond()
        // Let's assume history.length <= 1 means first turn if system prompt is not counted
        // In engine.ts, isFirstTurn checks conversationState.turnCount === 0
        // We might need to pass isFirstTurn in context or just check history length
        // Let's check history length. If it's just [system, user], length is 2.
        // But context.history probably doesn't include system prompt yet?
        // In engine.ts, messages are passed.

        const isFirstTurn = history.length <= 1;

        if (
            config.ENABLE_ECHO_FRAGMENTS &&
            !isFirstTurn &&
            getTestRandom() < config.ECHO_FRAGMENT_PROB &&
            intent === "general" &&
            !metadata.gaveUp
        ) {
            const echo = ECHO_FRAGMENTS[Math.floor(getTestRandom() * ECHO_FRAGMENTS.length)];
            return text + " " + echo;
        }
        return text;
    }
}

export class TruncationProcessor implements Processor {
    name = "Truncation";

    process(text: string, context: PipelineContext): string {
        const { effort } = context;

        // Normalize text - ensure it's never empty
        let processed = (text ?? "").trim();
        if (!processed) {
            processed = "meh… too tired for that right now.";
        }
        if (processed.length === 0) {
            processed = "meh… too tired for that right now.";
        }

        // HARD LENGTH CAPS per effort band
        const maxChars = effort <= 15 ? 120 : effort <= 35 ? 200 : effort <= 85 ? 800 : 2000;

        if (processed.length > maxChars) {
            // Truncate at word boundary, preserve last sentence if possible
            const truncated = processed.substring(0, maxChars);
            const lastSentenceEnd = Math.max(
                truncated.lastIndexOf('.'),
                truncated.lastIndexOf('!'),
                truncated.lastIndexOf('?')
            );

            if (lastSentenceEnd > maxChars * 0.7) {
                processed = truncated.substring(0, lastSentenceEnd + 1);
            } else {
                const lastSpace = truncated.lastIndexOf(' ');
                if (lastSpace > maxChars * 0.8) {
                    processed = truncated.substring(0, lastSpace) + '...';
                } else {
                    processed = truncated + '...';
                }
            }

            // Never truncate to empty - ensure minimum length
            if (processed.length < 4) {
                processed = "ok.";
            }
        }
        return processed;
    }
}
