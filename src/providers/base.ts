import { LLMProvider, QueryOptions, LLMResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";

export abstract class BaseProvider implements LLMProvider {
  protected apiKey: string;
  protected defaultModel: string;
  protected defaultTemperature: number;
  protected defaultMaxTokens: number;
  
  constructor(
    public name: string,
    apiKey: string,
    defaultModel: string,
    defaultTemperature = 0.7,
    defaultMaxTokens = 4096
  ) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    this.defaultTemperature = defaultTemperature;
    this.defaultMaxTokens = defaultMaxTokens;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async query(prompt: string, options?: QueryOptions): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error(`${this.name} provider is not configured`);
    }

    const startTime = Date.now();
    
    try {
      const response = await withRetry(
        () => this.doQuery(prompt, options),
        {
          retries: 3,
          onFailedAttempt: (error: any) => {
            logger.warn(`${this.name} query attempt failed:`, error.message);
          },
          // NonRetriableError는 재시도하지 않음
          retryIf: (error: any) => {
            if ((error as any).name === 'NonRetriableError') {
              logger.error(`${this.name} non-retriable error:`, (error as any).originalError?.message || error.message);
              return false;
            }
            return true;
          }
        }
      );

      return {
        ...response,
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      // NonRetriableError의 경우 원래 에러 메시지 사용
      const errorMessage = error.name === 'NonRetriableError' 
        ? (error.originalError?.message || error.message)
        : (error instanceof Error ? error.message : "Unknown error");
      
      logger.error(`${this.name} query failed:`, errorMessage);
      
      return {
        provider: this.name,
        model: options?.model || this.defaultModel,
        content: "",
        error: errorMessage,
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  protected abstract doQuery(prompt: string, options?: QueryOptions): Promise<LLMResponse>;
}