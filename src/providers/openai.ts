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

    try {
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
    } catch (error: any) {
      // OpenAI API 에러를 분류하여 재시도 가능 여부 결정
      if (this.isRetriableError(error)) {
        throw error; // 재시도 가능한 에러는 그대로 throw
      } else {
        // 재시도 불가능한 에러는 NonRetriableError로 래핑
        const nonRetriableError = new Error(error.message);
        (nonRetriableError as any).name = 'NonRetriableError';
        (nonRetriableError as any).originalError = error;
        throw nonRetriableError;
      }
    }
  }
  
  private isRetriableError(error: any): boolean {
    // OpenAI API 에러 코드 기반 분류
    if (error?.status) {
      // 5xx 서버 에러: 재시도 가능
      if (error.status >= 500) return true;
      
      // 429 Too Many Requests: 재시도 가능
      if (error.status === 429) return true;
      
      // 408 Request Timeout: 재시도 가능
      if (error.status === 408) return true;
      
      // 4xx 클라이언트 에러: 재시도 불가능
      if (error.status >= 400 && error.status < 500) return false;
    }
    
    // 네트워크 관련 에러: 재시도 가능
    if (error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // 기타 알 수 없는 에러: 재시도 가능 (안전한 기본값)
    return true;
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