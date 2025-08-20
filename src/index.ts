#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";
import { ProxyServer } from "./proxy/index.js";

async function main() {
  try {
    logger.info("Starting LLM Provider MCP Server v2.0.1");
    
    // 프록시 서버 시작 (환경 변수로 제어)
    let proxyServer: ProxyServer | null = null;
    if (process.env.ENABLE_PROXY === 'true') {
      const proxyPort = parseInt(process.env.PROXY_PORT || '3000');
      proxyServer = new ProxyServer({
        port: proxyPort,
        enableCors: true,
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
      });
      
      await proxyServer.start();
      logger.info(`Proxy server started on port ${proxyPort}`);
    }
    
    const server = createServer();
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    
    logger.info("Server connected successfully");
    
    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down server...");
      if (proxyServer) {
        await proxyServer.stop();
      }
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