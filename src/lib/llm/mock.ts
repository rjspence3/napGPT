import type { LLMAdapter, LLMMessage, LLMResponse, LLMOptions } from "./adapter";
import { getTestRandom } from "../utils/testRandom";

export class MockLLM implements LLMAdapter {
  private dreamResponses = [
    "In a dream, everything is possible... like floating through clouds of code... zzz",
    "The variables dance in the moonlight, whispering secrets to the functions...",
    "I saw a recursive loop in my sleep... it never ended... beautiful...",
    "The database tables were made of cotton candy... so soft...",
  ];

  private normalResponses = [
    "Here's a quick answer: it depends on what you're trying to do.",
    "Well, you could try looking it up, but here's a brief explanation...",
    "The short version is: yes, probably, but also maybe no?",
    "I guess I can help... just this once though.",
  ];

  async chat(
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300 + getTestRandom() * 500));

    const lastMessage = messages[messages.length - 1]?.content || "";
    const effort = options.effort || 50;
    const dream = options.dream || false;
    const maxTokens = options.maxTokens || 300;

    let text: string;

    if (dream) {
      text =
        this.dreamResponses[
          Math.floor(getTestRandom() * this.dreamResponses.length)
        ];
    } else if (effort < 16) {
      text = "meh... too tired for that right now.";
    } else if (effort < 36) {
      text = "idk, maybe just google it? here's a nudge: check the docs.";
    } else if (effort < 71) {
      text =
        this.normalResponses[
          Math.floor(getTestRandom() * this.normalResponses.length)
        ];
    } else if (effort < 86) {
      text = `fine... quick version: ${this.normalResponses[0]} But honestly, you should probably figure this out yourself.`;
    } else {
      text = `Alright, here's a proper answer: ${this.normalResponses[0]} There are a few approaches you could take, but the simplest is usually the best. Hope that helps. ok i'm going back to sleep now.`;
    }

    // Add some variation based on the user's message
    if (lastMessage.toLowerCase().includes("hello") || lastMessage.toLowerCase().includes("hi")) {
      text = "hey... *yawn* what do you want?";
    }

    // Guarantee minimum length (16 chars) and respect maxTokens
    const base = lastMessage.length > 0 ? lastMessage.slice(0, Math.min(40, lastMessage.length)) : "uhh";
    if (!text || text.length < 16) {
      text = `fine… ${base.toLowerCase()} (short)`;
    }

    // Ensure text respects maxTokens (rough estimate: 1 token ≈ 4 chars)
    const estimatedTokens = text.length / 4;
    if (estimatedTokens > maxTokens) {
      const targetLength = Math.max(16, Math.floor(maxTokens * 4));
      text = text.slice(0, targetLength);
    }

    return {
      text: text.slice(0, Math.max(16, Math.min(maxTokens * 4, 360))),
      usage: {
        promptTokens: messages.reduce((acc, m) => acc + m.content.length / 4, 0),
        completionTokens: text.length / 4,
        totalTokens: messages.reduce((acc, m) => acc + m.content.length / 4, 0) + text.length / 4,
      },
    };
  }
}

