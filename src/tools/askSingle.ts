import { LLMProvider, QueryOptions, LLMResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { getCache } from "../utils/cache.js";
import { formatResponse } from "../utils/formatter.js";

interface AskSingleArgs {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export async function askSingleTool(provider: LLMProvider, args: AskSingleArgs) {
  try {
    const cacheKey = `${provider.name}:${args.prompt}:${args.model || "default"}`;
    const cached = getCache().get(cacheKey) as LLMResponse | undefined;
    
    if (cached) {
      logger.debug(`Cache hit for ${provider.name}`);
      return {
        content: [
          {
            type: "text",
            text: formatResponse(cached)
          }
        ]
      };
    }

    logger.info(`Querying ${provider.name}...`);
    
    const options: QueryOptions = {
      model: args.model,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      systemPrompt: args.systemPrompt
    };

    const response = await provider.query(args.prompt, options);
    
    if (!response.error) {
      getCache().set(cacheKey, response);
    }

    return {
      content: [
        {
          type: "text",
          text: formatResponse(response)
        }
      ]
    };
    
  } catch (error) {
    logger.error(`Error in askSingleTool for ${provider.name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error querying ${provider.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      ],
      isError: true
    };
  }
}
