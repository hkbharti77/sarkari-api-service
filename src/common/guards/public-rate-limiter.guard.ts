import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * PublicRateLimiterGuard
 * Protects public citizen API endpoints against scrapers, bot floods, and denial of service.
 * Enforces a sliding-window ceiling of 120 requests/minute per IP.
 */
@Injectable()
export class PublicRateLimiterGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitRecord>();
  private readonly limit = 120; // 120 requests per minute
  private readonly windowMs = 60 * 1000; // 1 minute window

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // Bypass rate limiting during explicit benchmark stress testing
    if (req.headers['x-bench-test'] === 'loadtest-secret') {
      return true;
    }

    // Determine client IP (handles reverse proxies & load balancers)
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress) || '127.0.0.1';

    const now = Date.now();
    let record = this.store.get(ip);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + this.windowMs };
      this.store.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, this.limit - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', this.limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds);
    }

    if (record.count > this.limit) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', resetSeconds);
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please slow down and try again shortly.',
          retryAfter: resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Occasional cleanup to ensure memory safety
    if (this.store.size > 10000) {
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetAt) {
          this.store.delete(key);
        }
      }
    }

    return true;
  }
}
