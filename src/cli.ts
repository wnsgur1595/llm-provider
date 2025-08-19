#!/usr/bin/env node
import { printEnvironmentDiagnostic } from "./utils/envDiagnostic.js";
import { createServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "./utils/logger.js";

const args = process.argv.slice(2);

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
LLM Provider MCP Server v2.0.0

Usage:
  llm-provider                Run the MCP server
  llm-provider --env-check    Check environment variables configuration
  llm-provider --help         Show this help message

Environment Variables:
  OPENAI_API_KEY             OpenAI API key (sk-...)
  ANTHROPIC_API_KEY          Anthropic API key (sk-ant-...)
  GOOGLE_API_KEY             Google AI API key
  PERPLEXITY_API_KEY         Perplexity API key (pplx-...)

Optional Configuration:
  LOG_LEVEL                  Log level (debug, info, warn, error)
  CACHE_TTL                  Cache time-to-live in seconds
  ENABLE_STREAMING           Enable streaming responses (true/false)
  MAX_RETRIES                Maximum retry attempts
  TIMEOUT                    Request timeout in milliseconds

For more information, visit: https://github.com/wnsgur1595/llm-provider
`);
    return;
  }

  if (args.includes('--env-check') || args.includes('--env')) {
    printEnvironmentDiagnostic();
    return;
  }

  try {
    logger.info("Starting LLM Provider MCP Server v2.0.0");
    
    const server = createServer();
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    
    logger.info("Server connected successfully");
    
    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down server...");
      await server.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});