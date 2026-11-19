import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Job, JobSchema } from './schemas/job.schema';
import { JobsService } from './services/jobs.service';
import { QuotaCalculationService } from './services/quota-calculation.service';
import { KpiService } from './services/kpi.service';
import { AdminJobsController } from './controllers/admin-jobs.controller';
import { KpiController } from './controllers/kpi.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    AuthModule,   // provides JwtAuthGuard, RolesGuard, AuditService
  ],
  providers: [
    JobsService,
    QuotaCalculationService,
    KpiService,
  ],
  controllers: [
    AdminJobsController,
    KpiController,
  ],
  exports: [
    JobsService,
    QuotaCalculationService,
    KpiService,
  ],
})
export class JobsModule {}
