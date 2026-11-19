import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: unknown, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deletePattern(pattern: RegExp): void {
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.store.delete(key);
      }
    }
  }

  flushAll(): void {
    this.store.clear();
  }
}

@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    // Cache only GET requests on public endpoints
    if (req.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `cache:${req.originalUrl || req.url}`;
    const cached = this.cacheService.get(cacheKey);

    if (cached !== null) {
      return of(cached);
    }

    // Default TTL 60 seconds
    const ttl = req.url.includes('home-summary') ? 60 : 120;

    return next.handle().pipe(
      tap((data) => {
        if (data) {
          this.cacheService.set(cacheKey, data, ttl);
        }
      }),
    );
  }
}
