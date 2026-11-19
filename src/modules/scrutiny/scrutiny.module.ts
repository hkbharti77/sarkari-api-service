import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CandidateDossier,
  CandidateDossierSchema,
} from './schemas/candidate-dossier.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { ScrutinyService } from './scrutiny.service';
import { ScrutinyController } from './scrutiny.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CandidateDossier.name, schema: CandidateDossierSchema },
      { name: Job.name, schema: JobSchema },   // needed for counter updates
    ]),
    AuthModule,  // provides JwtAuthGuard, RolesGuard, AuditService
  ],
  providers: [ScrutinyService],
  controllers: [ScrutinyController],
  exports: [ScrutinyService],
})
export class ScrutinyModule {}
