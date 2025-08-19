import pRetry from "p-retry";
import { logger } from "./logger.js";

interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
  onFailedAttempt?: (error: any) => void;
  retryIf?: (error: any) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // retryIf 옵션이 있는 경우, 커스텀 retry 로직 사용
  if (options.retryIf) {
    const maxRetries = options.retries || 3;
    const minTimeout = options.minTimeout || 1000;
    const maxTimeout = options.maxTimeout || 10000;
    
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // 마지막 시도인 경우 바로 throw
        if (attempt === maxRetries) {
          throw error;
        }
        
        // retryIf 조건 확인
        if (!options.retryIf(error)) {
          throw error;
        }
        
        // onFailedAttempt 콜백 호출
        if (options.onFailedAttempt) {
          const errorInfo = Object.assign({}, error, {
            attemptNumber: attempt + 1,
            retriesLeft: maxRetries - attempt - 1
          });
          options.onFailedAttempt(errorInfo);
        }
        
        // 대기 시간 계산 (exponential backoff with jitter)
        const baseTimeout = Math.min(minTimeout * Math.pow(2, attempt), maxTimeout);
        const jitter = options.randomize !== false ? Math.random() * 0.1 : 0;
        const timeout = baseTimeout * (1 + jitter);
        
        logger.debug(`Retrying in ${Math.round(timeout)}ms...`);
        await new Promise(resolve => setTimeout(resolve, timeout));
      }
    }
    throw lastError;
  }
  
  // 기본 p-retry 사용
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