import { z } from "zod";
import { logger } from "../utils/logger.js";

// 환경변수 로딩 우선순위:
// 1. MCP Server env 프로퍼티 (최우선)
// 2. 시스템/사용자 환경변수
// 3. 기본값

function logEnvironmentStatus() {
  // 환경변수 소스 추적을 위한 로깅
  const envSources: Record<string, string> = {};
  const apiKeys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'PERPLEXITY_API_KEY'];
  
  apiKeys.forEach(key => {
    if (process.env[key]) {
      // 환경변수가 유효한 API 키인지 확인
      envSources[key] = isValidApiKey(process.env[key]) ? 'configured' : 'placeholder';
    } else {
      envSources[key] = 'not_set';
    }
  });

  logger.info("Environment variable status:", envSources);
  
  const configuredProviders = Object.entries(envSources)
    .filter(([_, status]) => status === 'configured')
    .map(([key, _]) => key.replace('_API_KEY', ''));
    
  if (configuredProviders.length > 0) {
    logger.info(`Configured providers: ${configuredProviders.join(', ')}`);
  } else {
    logger.warn("No API keys configured. Please set API keys in MCP server configuration");
  }
}

function isValidApiKey(key?: string): boolean {
  if (!key) return false;
  // API 키가 존재하고 비어있지 않으면 유효하다고 간주
  return key.trim().length > 0;
}

const ConfigSchema = z.object({
  openai: z.object({
    apiKey: z.string().optional(),
    model: z.string().default("gpt-5"),
    temperature: z.number().default(0.7),
    maxTokens: z.number().default(4096)
  }),
  anthropic: z.object({
    apiKey: z.string().optional(),
    model: z.string().default("claude-sonnet-4"),
    temperature: z.number().default(0.7),
    maxTokens: z.number().default(4096)
  }),
  google: z.object({
    apiKey: z.string().optional(),
    model: z.string().default("gemini-2.5-pro"),
    temperature: z.number().default(0.7),
    maxTokens: z.number().default(4096)
  }),
  perplexity: z.object({
    apiKey: z.string().optional(),
    model: z.string().default("sonar"),
    temperature: z.number().default(0.7),
    maxTokens: z.number().default(4096)
  }),
  server: z.object({
    logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
    cacheTTL: z.number().default(3600),
    enableStreaming: z.boolean().default(true),
    maxRetries: z.number().default(3),
    timeout: z.number().default(30000)
  })
});

export type Config = z.infer<typeof ConfigSchema>;

function getApiKey(key: string): string | undefined {
  // MCP Server env 프로퍼티에서 전달된 환경변수가 최우선
  // 그 다음 시스템 환경변수
  const value = process.env[key];
  return isValidApiKey(value) ? value : undefined;
}

function getConfigValue(key: string, defaultValue: string): string {
  // MCP Server env 프로퍼티 -> 시스템 환경변수 -> 기본값 순서
  return process.env[key] || defaultValue;
}

function getNumericConfigValue(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = key.includes('TEMPERATURE') ? parseFloat(value) : parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function loadConfig(): Config {
  try {
    // 환경변수 상태 로깅
    logEnvironmentStatus();

    const config = ConfigSchema.parse({
      openai: {
        apiKey: getApiKey('OPENAI_API_KEY'),
        model: getConfigValue('OPENAI_MODEL', "gpt-5"),
        temperature: getNumericConfigValue('OPENAI_TEMPERATURE', 0.7),
        maxTokens: getNumericConfigValue('OPENAI_MAX_TOKENS', 4096)
      },
      anthropic: {
        apiKey: getApiKey('ANTHROPIC_API_KEY'),
        model: getConfigValue('ANTHROPIC_MODEL', "claude-sonnet-4"),
        temperature: getNumericConfigValue('ANTHROPIC_TEMPERATURE', 0.7),
        maxTokens: getNumericConfigValue('ANTHROPIC_MAX_TOKENS', 4096)
      },
      google: {
        apiKey: getApiKey('GOOGLE_API_KEY'),
        model: getConfigValue('GOOGLE_MODEL', "gemini-2.5-pro"),
        temperature: getNumericConfigValue('GOOGLE_TEMPERATURE', 0.7),
        maxTokens: getNumericConfigValue('GOOGLE_MAX_TOKENS', 4096)
      },
      perplexity: {
        apiKey: getApiKey('PERPLEXITY_API_KEY'),
        model: getConfigValue('PERPLEXITY_MODEL', "sonar"),
        temperature: getNumericConfigValue('PERPLEXITY_TEMPERATURE', 0.7),
        maxTokens: getNumericConfigValue('PERPLEXITY_MAX_TOKENS', 4096)
      },
      server: {
        logLevel: (getConfigValue('LOG_LEVEL', 'info') as any),
        cacheTTL: getNumericConfigValue('CACHE_TTL', 3600),
        enableStreaming: getConfigValue('ENABLE_STREAMING', 'true') !== 'false',
        maxRetries: getNumericConfigValue('MAX_RETRIES', 3),
        timeout: getNumericConfigValue('TIMEOUT', 30000)
      }
    });
    
    logger.debug("Configuration loaded successfully");
    return config;
    
  } catch (error) {
    logger.error("Failed to load configuration:", error);
    throw error;
  }
}