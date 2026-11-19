import { Global, Module } from '@nestjs/common';
import {
  CacheService,
  PublicCacheInterceptor,
} from './cache-invalidation.interceptor';

@Global()
@Module({
  providers: [CacheService, PublicCacheInterceptor],
  exports: [CacheService, PublicCacheInterceptor],
})
export class AppCacheModule {}
