import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseProvider } from "./base.js";
import { QueryOptions, LLMResponse } from "../types/index.js";

export class GoogleProvider extends BaseProvider {
  private client!: GoogleGenerativeAI;

  constructor(apiKey: string, defaultModel = "gemini-2.5-pro", defaultTemperature = 0.7, defaultMaxTokens = 4096) {
    super("Google", apiKey, defaultModel, defaultTemperature, defaultMaxTokens);
    
    if (this.isAvailable()) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  protected async doQuery(prompt: string, options?: QueryOptions): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: options?.model || this.defaultModel,
      generationConfig: {
        temperature: options?.temperature ?? this.defaultTemperature,
        maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens
      }
    });

    const chat = model.startChat({
      history: options?.context?.map(ctx => ({
        role: ctx.role === "assistant" ? "model" : "user",
        parts: [{ text: ctx.content }]
      })) || []
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const content = response.text();

    return {
      provider: this.name,
      model: options?.model || this.defaultModel,
      content,
      usage: response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount || 0,
        completionTokens: response.usageMetadata.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata.totalTokenCount || 0
      } : undefined,
      latency: 0,
      timestamp: ""
    };
  }

  async *stream(prompt: string, options?: QueryOptions): AsyncGenerator<string> {
    if (!this.isAvailable()) {
      throw new Error("Google provider is not configured");
    }

    const model = this.client.getGenerativeModel({
      model: options?.model || this.defaultModel,
      generationConfig: {
        temperature: options?.temperature ?? this.defaultTemperature,
        maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens
      }
    });

    const chat = model.startChat({
      history: options?.context?.map(ctx => ({
        role: ctx.role === "assistant" ? "model" : "user",
        parts: [{ text: ctx.content }]
      })) || []
    });

    const result = await chat.sendMessageStream(prompt);
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}