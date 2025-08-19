import Anthropic from "@anthropic-ai/sdk";
import { BaseProvider } from "./base.js";
import { QueryOptions, LLMResponse } from "../types/index.js";

export class AnthropicProvider extends BaseProvider {
  private client!: Anthropic;

  constructor(apiKey: string, defaultModel = "claude-sonnet-4", defaultTemperature = 0.7, defaultMaxTokens = 4096) {
    super("Anthropic", apiKey, defaultModel, defaultTemperature, defaultMaxTokens);
    
    if (this.isAvailable()) {
      this.client = new Anthropic({ apiKey });
    }
  }

  protected async doQuery(prompt: string, options?: QueryOptions): Promise<LLMResponse> {
    const systemPrompt = options?.systemPrompt || "You are a helpful AI assistant.";
    
    const messages: Anthropic.MessageParam[] = [];
    
    if (options?.context) {
      for (const ctx of options.context) {
        if (ctx.role !== "system") {
          messages.push({
            role: ctx.role === "user" ? "user" : "assistant",
            content: ctx.content
          });
        }
      }
    }
    
    messages.push({ role: "user", content: prompt });

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      system: systemPrompt,
      messages,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens
    });

    const content = response.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");

    return {
      provider: this.name,
      model: response.model,
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      latency: 0,
      timestamp: ""
    };
  }

  async *stream(prompt: string, options?: QueryOptions): AsyncGenerator<string> {
    if (!this.isAvailable()) {
      throw new Error("Anthropic provider is not configured");
    }

    const systemPrompt = options?.systemPrompt || "You are a helpful AI assistant.";
    
    const messages: Anthropic.MessageParam[] = [];
    
    if (options?.context) {
      for (const ctx of options.context) {
        if (ctx.role !== "system") {
          messages.push({
            role: ctx.role === "user" ? "user" : "assistant",
            content: ctx.content
          });
        }
      }
    }
    
    messages.push({ role: "user", content: prompt });

    const stream = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      system: systemPrompt,
      messages,
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        yield chunk.delta.text;
      }
    }
  }
}