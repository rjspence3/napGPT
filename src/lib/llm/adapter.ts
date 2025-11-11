import { OpenAIClient } from "./openai";
import { MockLLM } from "./mock";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMAdapter {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  effort?: number;
  dream?: boolean;
  timeoutMs?: number;
  stop?: string[];
}

export function getLLM(): LLMAdapter {
  // Support provider selection via env
  const provider = (process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'mock')).toLowerCase();
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || process.env.NAPGPT_MODEL || "gpt-4o-mini";
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || process.env.NAPGPT_MAX_TOKENS || "128", 10);

  if (apiKey && provider === 'openai') {
    return new OpenAIClient({
      apiKey,
      model,
      maxTokens,
    });
  }

  // TODO: Add Anthropic support
  // if (apiKey && provider === 'anthropic') {
  //   return new AnthropicClient({ apiKey, model, maxTokens });
  // }

  // Fallback to mock if no API key
  return new MockLLM();
}

// Export current provider/model for test verification
export function getLLMConfig(): { provider: string; model: string; maxTokens: number } {
  const provider = (process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'mock')).toLowerCase();
  const model = process.env.LLM_MODEL || process.env.NAPGPT_MODEL || "gpt-4o-mini";
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || process.env.NAPGPT_MAX_TOKENS || "128", 10);
  return { provider, model, maxTokens };
}

