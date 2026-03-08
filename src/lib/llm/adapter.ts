import { OpenAIClient } from "./openai";
import { AnthropicClient } from "./anthropic";
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

function resolveProvider(): string {
  if (process.env.LLM_PROVIDER) return process.env.LLM_PROVIDER.toLowerCase();
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'mock';
}

function resolveApiKey(provider: string): string | undefined {
  return (
    process.env.LLM_API_KEY ||
    (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : undefined) ||
    process.env.OPENAI_API_KEY
  );
}

function resolveModel(provider: string): string {
  return (
    process.env.LLM_MODEL ||
    process.env.NAPGPT_MODEL ||
    (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o-mini')
  );
}

export function getLLM(): LLMAdapter {
  const provider = resolveProvider();
  const apiKey = resolveApiKey(provider);
  const model = resolveModel(provider);
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || process.env.NAPGPT_MAX_TOKENS || "128", 10);

  if (apiKey && provider === 'anthropic') {
    return new AnthropicClient({ apiKey, model, maxTokens });
  }

  if (apiKey && provider === 'openai') {
    return new OpenAIClient({ apiKey, model, maxTokens });
  }

  // Fallback to mock if no API key
  return new MockLLM();
}

// Export current provider/model for test verification
export function getLLMConfig(): { provider: string; model: string; maxTokens: number } {
  const provider = resolveProvider();
  const model = resolveModel(provider);
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || process.env.NAPGPT_MAX_TOKENS || "128", 10);
  return { provider, model, maxTokens };
}

