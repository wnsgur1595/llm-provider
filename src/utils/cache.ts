import NodeCache from "node-cache";
import { logger } from "./logger.js";

let cacheInstance: NodeCache | null = null;

export function getCache(ttl = 3600): NodeCache {
  if (!cacheInstance) {
    cacheInstance = new NodeCache({
      stdTTL: ttl,
      checkperiod: 600,
      useClones: false
    });
    
    cacheInstance.on("expired", (key, value) => {
      logger.debug(`Cache expired for key: ${key}`);
    });
  }
  
  return cacheInstance;
}

export function clearCache(): void {
  if (cacheInstance) {
    cacheInstance.flushAll();
    logger.info("Cache cleared");
  }
}