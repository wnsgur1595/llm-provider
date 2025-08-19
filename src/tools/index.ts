import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LLMProvider } from "../types/index.js";
import { Config } from "../config/index.js";
import { askSingleTool } from "./askSingle.js";
import { askAllTool } from "./askAll.js";
import { compareTool } from "./compare.js";
import { logger } from "../utils/logger.js";

export function registerTools(server: McpServer, providers: LLMProvider[], config: Config) {
  // Register individual provider tools
  for (const provider of providers) {
    const providerConfig = config[provider.name.toLowerCase() as keyof Config];
    const defaultModel = typeof providerConfig === 'object' && 'model' in providerConfig ? 
      (providerConfig as any).model : "default";

    server.tool(
      `ask_${provider.name.toLowerCase()}`,
      {
        prompt: z.string().describe("The prompt to send to the LLM"),
        model: z.string().optional().describe(`Optional: specific model to use (default: ${defaultModel})`),
        temperature: z.number().min(0).max(2).optional().describe("Optional: temperature for response generation (0-2)"),
        maxTokens: z.number().min(1).optional().describe("Optional: maximum tokens in response"),
        systemPrompt: z.string().optional().describe("Optional: system prompt to set context")
      },
      async (args: any) => {
        const result = await askSingleTool(provider, args);
        return {
          content: result.content.map((item: any) => ({
            type: "text" as const,
            text: item.text
          }))
        };
      }
    );
  }

  // Register ask_all tool if multiple providers available
  if (providers.length > 1) {
    server.tool(
      "ask_all_llms",
      {
        prompt: z.string().describe("The prompt to send to all LLMs"),
        systemPrompt: z.string().optional().describe("Optional: system prompt to set context for all LLMs"),
        temperature: z.number().min(0).max(2).optional().describe("Optional: temperature for all responses (0-2)"),
        maxTokens: z.number().min(1).optional().describe("Optional: maximum tokens in each response")
      },
      async (args: any) => {
        const result = await askAllTool(providers, args);
        return {
          content: result.content.map((item: any) => ({
            type: "text" as const,
            text: item.text
          }))
        };
      }
    );

    server.tool(
      "compare_llm_responses",
      {
        prompt: z.string().describe("The prompt to send to all LLMs"),
        providers: z.array(z.string()).optional().describe("Optional: specific providers to query (default: all)"),
        analyzeConsensus: z.boolean().default(true).describe("Whether to analyze consensus among responses"),
        systemPrompt: z.string().optional().describe("Optional: system prompt for all LLMs")
      },
      async (args: any) => {
        const result = await compareTool(providers, args);
        return {
          content: result.content.map((item: any) => ({
            type: "text" as const,
            text: item.text
          }))
        };
      }
    );
  }

  const toolCount = providers.length + (providers.length > 1 ? 2 : 0);
  logger.info(`Registered ${toolCount} tools`);
}