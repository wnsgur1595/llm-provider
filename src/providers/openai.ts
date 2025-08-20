import OpenAI from "openai";
import { BaseProvider } from "./base.js";
import { QueryOptions, LLMResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";

export interface OpenAIProviderConfig {
  apiKey: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  useProxy?: boolean;
  proxyUrl?: string;
}

export class OpenAIProvider extends BaseProvider {
  private client!: OpenAI;
  private useProxy: boolean;
  private proxyUrl: string;

  constructor(config: OpenAIProviderConfig | string, defaultModel = "gpt-5", defaultTemperature = 0.7, defaultMaxTokens = 4096) {
    // 이전 버전 호환성을 위한 처리
    if (typeof config === 'string') {
      super("OpenAI", config, defaultModel, defaultTemperature, defaultMaxTokens);
      this.useProxy = false;
      this.proxyUrl = '';
    } else {
      super("OpenAI", config.apiKey, config.defaultModel || defaultModel, config.defaultTemperature || defaultTemperature, config.defaultMaxTokens || defaultMaxTokens);
      this.useProxy = config.useProxy || false;
      this.proxyUrl = config.proxyUrl || 'http://localhost:3000';
    }
    
    if (this.isAvailable()) {
      if (this.useProxy) {
        // 프록시 모드에서는 OpenAI 클라이언트를 초기화하지 않음
        logger.info("OpenAI provider configured with proxy mode");
      } else {
        this.client = new OpenAI({ apiKey: this.apiKey });
      }
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
      let completion: any;

      if (this.useProxy) {
        // 프록시를 통한 API 호출
        completion = await this.callViaProxy({
          model: options?.model || this.defaultModel,
          messages,
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stream: false
        });
      } else {
        // 직접 API 호출 (기존 방식)
        completion = await this.client.chat.completions.create({
          model: options?.model || this.defaultModel,
          messages,
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stream: false
        });
      }

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

  private async callViaProxy(requestBody: any): Promise<any> {
    const proxyEndpoint = `${this.proxyUrl}/proxy/openai/chat/completions`;
    
    logger.info(`Calling OpenAI via proxy: ${proxyEndpoint}`);
    
    const response = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
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

    if (this.useProxy) {
      // 프록시를 통한 스트리밍 호출
      yield* this.streamViaProxy({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        stream: true
      });
    } else {
      // 직접 스트리밍 호출 (기존 방식)
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

  private async *streamViaProxy(requestBody: any): AsyncGenerator<string> {
    const proxyEndpoint = `${this.proxyUrl}/proxy/openai/chat/completions`;
    
    logger.info(`Streaming OpenAI via proxy: ${proxyEndpoint}`);
    
    const response = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy streaming request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader for streaming");
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // JSON 파싱 에러 무시
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}