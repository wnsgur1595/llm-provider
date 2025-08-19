import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./utils/logger.js";
import { loadConfig } from "./config/index.js";
import { registerTools } from "./tools/index.js";
import { initializeProviders } from "./providers/index.js";

export function createServer(): McpServer {
  const config = loadConfig();
  
  const server = new McpServer(
    {
      name: "llm-provider",
      version: "2.0.1",
      description: "Query multiple LLMs for verification and comparison"
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  // Initialize providers based on available API keys
  const providers = initializeProviders(config);
  
  // 프로바이더 초기화 결과는 initializeProviders에서 이미 로깅됨

  // Register all tools
  registerTools(server, providers, config);

  return server;
}