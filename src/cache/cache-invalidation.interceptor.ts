import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { from, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;
  private readonly memoryStore = new Map<string, CacheEntry>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initRedis();
  }

  onModuleDestroy() {
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {}
    }
  }

  private initRedis() {
    try {
      const redisUrl = this.configService.get<string>('redis.url');
      const redisHost = this.configService.get<string>('redis.host') || 'localhost';
      const redisPort = this.configService.get<number>('redis.port') || 6379;
      const redisPassword = this.configService.get<string>('redis.password');
      const redisTls = this.configService.get<boolean>('redis.tls');

      const options: any = {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 2000,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null; // Stop retrying if Redis is not running
          }
          return Math.min(times * 1000, 3000);
        },
      };

      if (redisPassword) options.password = redisPassword;
      if (redisTls) options.tls = {};

      if (redisUrl) {
        this.redisClient = new Redis(redisUrl, options);
      } else {
        this.redisClient = new Redis(redisPort, redisHost, options);
      }

      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        this.logger.log(`[CacheService] Connected to Redis server successfully (${redisHost}:${redisPort})`);
      });

      this.redisClient.on('ready', () => {
        this.isRedisConnected = true;
      });

      this.redisClient.on('error', (err) => {
        if (this.isRedisConnected) {
          this.logger.warn(`[CacheService] Redis error: ${err.message}. Seamlessly using In-Memory RAM.`);
        }
        this.isRedisConnected = false;
      });

      this.redisClient.on('close', () => {
        this.isRedisConnected = false;
      });

      // Attempt initial connection non-blockingly
      this.redisClient.connect().catch(() => {
        this.isRedisConnected = false;
        this.logger.log('[CacheService] Redis server not active locally; seamlessly using high-speed In-Memory RAM cache.');
      });
    } catch (err: any) {
      this.isRedisConnected = false;
      this.logger.warn(`[CacheService] Redis initialization skipped (${err.message}). Using In-Memory RAM cache.`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        if (val !== null) {
          return JSON.parse(val) as T;
        }
      } catch (err: any) {
        this.logger.warn(`[CacheService] Redis GET error: ${err.message}`);
      }
    }

    // In-memory fallback
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set(key: string, data: unknown, ttlSeconds: number): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        return;
      } catch (err: any) {
        this.logger.warn(`[CacheService] Redis SET error: ${err.message}`);
      }
    }

    // In-memory fallback
    this.memoryStore.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {}
    }
    this.memoryStore.delete(key);
  }

  async deletePattern(pattern: RegExp | string): Promise<void> {
    // Delete in Redis
    if (this.isRedisConnected && this.redisClient) {
      try {
        const searchPattern =
          typeof pattern === 'string'
            ? pattern.endsWith('*')
              ? pattern
              : `${pattern}*`
            : pattern.source.replace(/^\^/, '').replace(/\$$/, '*');
        const keys = await this.redisClient.keys(searchPattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (err: any) {
        this.logger.warn(`[CacheService] Redis deletePattern error: ${err.message}`);
      }
    }

    // Delete in Memory
    const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern;
    for (const key of this.memoryStore.keys()) {
      if (regex.test(key)) {
        this.memoryStore.delete(key);
      }
    }
  }

  async flushAll(): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch {}
    }
    this.memoryStore.clear();
  }

  isConnectedToRedis(): boolean {
    return this.isRedisConnected;
  }
}

@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Cache only GET requests on public endpoints
    if (req.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `cache:${req.originalUrl || req.url}`;

    return from(this.cacheService.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached !== null && cached !== undefined) {
          if (res && typeof res.setHeader === 'function') {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader(
              'Cache-Control',
              'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
            );
          }
          return of(cached);
        }

        const ttl = req.url.includes('home-summary') ? 60 : 120;

        return next.handle().pipe(
          tap((data) => {
            if (data) {
              this.cacheService.set(cacheKey, data, ttl);
              if (res && typeof res.setHeader === 'function') {
                res.setHeader('X-Cache', 'MISS');
                res.setHeader(
                  'Cache-Control',
                  'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
                );
              }
            }
          }),
        );
      }),
    );
  }
}
