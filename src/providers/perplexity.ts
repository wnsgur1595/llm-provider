import OpenAI from "openai";
import { BaseProvider } from "./base.js";
import { QueryOptions, LLMResponse } from "../types/index.js";

export class PerplexityProvider extends BaseProvider {
  private client!: OpenAI;

  constructor(apiKey: string, defaultModel = "sonar", defaultTemperature = 0.7, defaultMaxTokens = 4096) {
    super("Perplexity", apiKey, defaultModel, defaultTemperature, defaultMaxTokens);
    
    if (this.isAvailable()) {
      this.client = new OpenAI({
        apiKey,
        baseURL: "https://api.perplexity.ai"
      });
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
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens
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
      latency: 0,
      timestamp: ""
    };
  }
}