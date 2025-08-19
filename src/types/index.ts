export interface LLMProvider {
  name: string;
  query: (prompt: string, options?: QueryOptions) => Promise<LLMResponse>;
  stream?: (prompt: string, options?: QueryOptions) => AsyncGenerator<string>;
  isAvailable: () => boolean;
}

export interface QueryOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  context?: ConversationContext[];
  stream?: boolean;
}

export interface LLMResponse {
  provider: string;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
  timestamp: string;
  error?: string;
}

export interface ConversationContext {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ComparisonResult {
  query: string;
  responses: LLMResponse[];
  summary: {
    consensus?: string;
    differences?: string[];
    bestResponse?: string;
  };
  timestamp: string;
}