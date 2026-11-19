import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from '../modules/jobs/schemas/job.schema';
import {
  CandidateDossier,
  CandidateDossierSchema,
} from '../modules/scrutiny/schemas/candidate-dossier.schema';
import {
  AdminUser,
  AdminUserSchema,
} from '../modules/auth/schemas/admin-user.schema';
import {
  AuditLog,
  AuditLogSchema,
} from '../modules/auth/schemas/audit-log.schema';
import { TaxonomiesModule } from '../modules/taxonomies/taxonomies.module';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: CandidateDossier.name, schema: CandidateDossierSchema },
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    TaxonomiesModule,
  ],
  providers: [SeedService],
  controllers: [SeedController],
  exports: [SeedService],
})
export class SeedModule {}
