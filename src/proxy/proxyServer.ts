import express, { Request, Response } from 'express';
import cors from 'cors';
import { logger } from '../utils/logger.js';

export interface ProxyServerConfig {
  port: number;
  enableCors: boolean;
  allowedOrigins?: string[];
}

export class ProxyServer {
  private app: express.Application;
  private server: any;
  private config: ProxyServerConfig;

  constructor(config: ProxyServerConfig) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // JSON body parsing
    this.app.use(express.json());

    // CORS 설정
    if (this.config.enableCors) {
      const corsOptions = {
        origin: this.config.allowedOrigins || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true
      };
      this.app.use(cors(corsOptions));
    }

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`Proxy request: ${req.method} ${req.path}`, {
        headers: this.sanitizeHeaders(req.headers),
        body: req.method !== 'GET' ? req.body : undefined
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // OpenAI API 프록시 - 모든 하위 경로를 처리
    this.app.use('/proxy/openai', this.handleOpenAIProxy.bind(this));
    
    // 기본 에러 핸들러
    this.app.use((error: Error, req: Request, res: Response, next: any) => {
      logger.error('Proxy server error:', error);
      res.status(500).json({ 
        error: 'Internal proxy server error', 
        message: error.message 
      });
    });
  }

  private async handleOpenAIProxy(req: Request, res: Response): Promise<void> {
    try {
      // /proxy/openai 이후의 경로를 추출
      const originalPath = req.originalUrl || req.path;
      const proxyPath = originalPath.replace('/proxy/openai', '');
      const targetUrl = `https://api.openai.com/v1${proxyPath}`;

      logger.info(`Proxying to OpenAI: ${targetUrl}`);

      // Authorization 헤더 확인
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
      }

      // 브라우저 환경에서 fetch 사용 (Node.js 18+ 네이티브 지원)
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'LLM-Provider-Proxy/1.0'
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      });

      // 응답 헤더 복사
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        // CORS 관련 헤더는 제외 (이미 설정됨)
        if (!key.toLowerCase().startsWith('access-control-')) {
          responseHeaders[key] = value;
        }
      });

      res.set(responseHeaders);
      res.status(response.status);

      // 스트리밍 응답 처리
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body?.getReader();
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          } finally {
            reader.releaseLock();
          }
        }
        res.end();
      } else {
        // 일반 JSON 응답
        const data = await response.json();
        res.json(data);
      }

      logger.info(`Proxy response: ${response.status}`, {
        url: targetUrl,
        status: response.status
      });

    } catch (error: any) {
      logger.error('Proxy request failed:', error);
      res.status(500).json({ 
        error: 'Proxy request failed', 
        message: error.message 
      });
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    // 민감한 정보 제거
    if (sanitized.authorization) {
      sanitized.authorization = 'Bearer [REDACTED]';
    }
    if (sanitized['x-api-key']) {
      sanitized['x-api-key'] = '[REDACTED]';
    }
    return sanitized;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          logger.info(`Proxy server running on port ${this.config.port}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('Proxy server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Proxy server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}