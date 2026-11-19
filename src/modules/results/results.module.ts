import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import {
  CandidateDossier,
  CandidateDossierSchema,
} from '../scrutiny/schemas/candidate-dossier.schema';
import { ResultsService } from './services/results.service';
import { MeritEvaluationService } from './services/merit-evaluation.service';
import { ResultsController } from './results.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: CandidateDossier.name, schema: CandidateDossierSchema },
    ]),
    AuthModule,
  ],
  providers: [ResultsService, MeritEvaluationService],
  controllers: [ResultsController],
  exports: [ResultsService, MeritEvaluationService],
})
export class ResultsModule {}
