import { LLMProvider, QueryOptions } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { formatResponses } from "../utils/formatter.js";

interface AskAllArgs {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function askAllTool(providers: LLMProvider[], args: AskAllArgs) {
  try {
    logger.info(`Querying ${providers.length} LLMs in parallel...`);
    
    const options: QueryOptions = {
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      systemPrompt: args.systemPrompt
    };

    const promises = providers.map(provider => 
      provider.query(args.prompt, options).catch(error => ({
        provider: provider.name,
        model: "",
        content: "",
        error: error.message,
        latency: 0,
        timestamp: new Date().toISOString()
      }))
    );

    const responses = await Promise.all(promises);
    
    return {
      content: [
        {
          type: "text",
          text: formatResponses(responses)
        }
      ]
    };
    
  } catch (error) {
    logger.error("Error in askAllTool:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error querying LLMs: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      ],
      isError: true
    };
  }
}
