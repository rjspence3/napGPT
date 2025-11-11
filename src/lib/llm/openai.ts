import OpenAI from "openai";
import type { LLMAdapter, LLMMessage, LLMResponse, LLMOptions } from "./adapter";

export class OpenAIClient implements LLMAdapter {
  private client: OpenAI;
  private defaultModel: string;
  private defaultMaxTokens: number;

  constructor(config: {
    apiKey: string;
    model: string;
    maxTokens: number;
  }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
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

    try {
      const response = await this.client.chat.completions.create(
        {
          model: options.model || this.defaultModel,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options.temperature ?? 0.2, // Lower temperature for stability in tests
          max_tokens: options.maxTokens || this.defaultMaxTokens,
          stop: options.stop,
        },
        { signal: controller.signal }
      );

      clearTimeout(timer);

      const content = response.choices[0]?.message?.content?.trim() || "";
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      return {
        text: content,
        usage,
      };
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("LLM request timeout");
      }
      throw error;
    }
  }
}

