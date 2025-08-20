import { Config } from "../config/index.js";
import { LLMProvider } from "../types/index.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { PerplexityProvider } from "./perplexity.js";
import { logger } from "../utils/logger.js";

export function initializeProviders(config: Config): LLMProvider[] {
  const providers: LLMProvider[] = [];
  const skippedProviders: string[] = [];

  // Initialize OpenAI
  if (config.openai.apiKey) {
    try {
      providers.push(new OpenAIProvider({
        apiKey: config.openai.apiKey,
        defaultModel: config.openai.model,
        defaultTemperature: config.openai.temperature,
        defaultMaxTokens: config.openai.maxTokens,
        useProxy: config.openai.useProxy,
        proxyUrl: config.openai.proxyUrl
      }));
      const proxyMode = config.openai.useProxy ? " (proxy mode)" : "";
      logger.info(`✅ OpenAI provider initialized with model: ${config.openai.model}${proxyMode}`);
    } catch (error) {
      logger.error("Failed to initialize OpenAI provider:", error);
      skippedProviders.push("OpenAI");
    }
  } else {
    skippedProviders.push("OpenAI (no API key)");
  }

  // Initialize Anthropic
  if (config.anthropic.apiKey) {
    try {
      providers.push(new AnthropicProvider(
        config.anthropic.apiKey,
        config.anthropic.model,
        config.anthropic.temperature,
        config.anthropic.maxTokens
      ));
      logger.info(`✅ Anthropic provider initialized with model: ${config.anthropic.model}`);
    } catch (error) {
      logger.error("Failed to initialize Anthropic provider:", error);
      skippedProviders.push("Anthropic");
    }
  } else {
    skippedProviders.push("Anthropic (no API key)");
  }

  // Initialize Google
  if (config.google.apiKey) {
    try {
      providers.push(new GoogleProvider(
        config.google.apiKey,
        config.google.model,
        config.google.temperature,
        config.google.maxTokens
      ));
      logger.info(`✅ Google provider initialized with model: ${config.google.model}`);
    } catch (error) {
      logger.error("Failed to initialize Google provider:", error);
      skippedProviders.push("Google");
    }
  } else {
    skippedProviders.push("Google (no API key)");
  }

  // Initialize Perplexity
  if (config.perplexity.apiKey) {
    try {
      providers.push(new PerplexityProvider(
        config.perplexity.apiKey,
        config.perplexity.model,
        config.perplexity.temperature,
        config.perplexity.maxTokens
      ));
      logger.info(`✅ Perplexity provider initialized with model: ${config.perplexity.model}`);
    } catch (error) {
      logger.error("Failed to initialize Perplexity provider:", error);
      skippedProviders.push("Perplexity");
    }
  } else {
    skippedProviders.push("Perplexity (no API key)");
  }

  // 결과 로깅
  if (providers.length > 0) {
    logger.info(`🚀 Successfully initialized ${providers.length} provider(s): ${providers.map(p => p.name).join(", ")}`);
  }

  if (skippedProviders.length > 0) {
    logger.warn(`⚠️  Skipped ${skippedProviders.length} provider(s): ${skippedProviders.join(", ")}`);
  }

  if (providers.length === 0) {
    logger.error("❌ No LLM providers were initialized. Please configure API keys in MCP server settings.");
  }

  return providers;
}

export * from "./base.js";
export * from "./openai.js";
export * from "./anthropic.js";
export * from "./google.js";
export * from "./perplexity.js";