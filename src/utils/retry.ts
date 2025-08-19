import pRetry from "p-retry";
import { logger } from "./logger.js";

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: any = {}
): Promise<T> {
  return pRetry(fn, {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 10000,
    randomize: true,
    onFailedAttempt: (error: any) => {
      logger.debug(`Retry attempt ${error.attemptNumber} failed: ${error.message}`);
    },
    ...options
  });
}