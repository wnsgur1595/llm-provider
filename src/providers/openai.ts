import OpenAI from "openai";
import { BaseProvider } from "./base.js";
import { QueryOptions, LLMResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";

export class OpenAIProvider extends BaseProvider {
  private client!: OpenAI;

  constructor(apiKey: string, defaultModel = "gpt-5", defaultTemperature = 0.7, defaultMaxTokens = 4096) {
    super("OpenAI", apiKey, defaultModel, defaultTemperature, defaultMaxTokens);
    
    if (this.isAvailable()) {
      this.client = new OpenAI({ apiKey });
    }
  }

  protected async doQuery(prompt: string, options?: QueryOptions): Promise<LLMResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    
    if (options?.context) {
      for (const ctx of options.context) {
        messages.push({ role: ctx.role, content: ctx.content });
      }
    }
    
    messages.push({ role: "user", content: prompt });

    const completion = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      stream: false
    });

    const choice = completion.choices[0];
    
    return {
      provider: this.name,
      model: completion.model,
      content: choice.message?.content || "",
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      } : undefined,
      latency: 0, // Will be set by base class
      timestamp: "" // Will be set by base class
    };
  }

  async *stream(prompt: string, options?: QueryOptions): AsyncGenerator<string> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI provider is not configured");
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    
    if (options?.context) {
      for (const ctx of options.context) {
        messages.push({ role: ctx.role, content: ctx.content });
      }
    }
    
    messages.push({ role: "user", content: prompt });

    const stream = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}