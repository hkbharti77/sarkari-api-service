import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { TaxonomiesModule } from './modules/taxonomies/taxonomies.module';
import { AuthModule } from './modules/auth/auth.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ScrutinyModule } from './modules/scrutiny/scrutiny.module';
import { ResultsModule } from './modules/results/results.module';
import { PublicModule } from './modules/public/public.module';
import { ExaminationHubsModule } from './modules/examination-hubs/examination-hubs.module';
import { OperationsModule } from './modules/operations/operations.module';
import { AppCacheModule } from './cache/cache.module';
import { SeedModule } from './seeds/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    DatabaseModule,
    HealthModule,
    TaxonomiesModule,
    AuthModule,
    JobsModule,
    ScrutinyModule,
    ResultsModule,
    PublicModule,
    ExaminationHubsModule,
    OperationsModule,
    AppCacheModule,
    SeedModule,
  ],
})
export class AppModule {}
