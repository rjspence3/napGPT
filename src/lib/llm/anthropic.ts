import Anthropic from "@anthropic-ai/sdk";
import type { LLMAdapter, LLMMessage, LLMResponse, LLMOptions } from "./adapter";

export class AnthropicClient implements LLMAdapter {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;

  constructor(config: {
    apiKey: string;
    model: string;
    maxTokens: number;
  }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.model;
    this.defaultMaxTokens = config.maxTokens;
  }

  async chat(
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutMs = Math.min(options.timeoutMs ?? 8000, 15000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Anthropic separates the system message from the conversation
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const systemPrompt = systemMessages.map((m) => m.content).join("\n") || undefined;

    try {
      const response = await this.client.messages.create(
        {
          model: options.model || this.defaultModel,
          system: systemPrompt,
          messages: conversationMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens || this.defaultMaxTokens,
          stop_sequences: options.stop,
        },
        { signal: controller.signal }
      );

      clearTimeout(timer);

      const firstBlock = response.content[0];
      const raw = firstBlock?.type === "text" ? firstBlock.text : "";
      // Normalize empty completions - never return empty
      const text = raw.trim().length > 0 ? raw.trim() : "idk… maybe later (nap)";

      const usage = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      return { text, usage };
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("LLM request timeout");
      }
      throw error;
    }
  }
}
