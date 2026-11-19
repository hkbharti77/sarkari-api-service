import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  JobDocument,
  JobDocumentSchema,
} from './documents/schemas/job-document.schema';
import {
  AlertSubscription,
  AlertSubscriptionSchema,
} from './alerts/schemas/alert-subscription.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import {
  CandidateDossier,
  CandidateDossierSchema,
} from '../scrutiny/schemas/candidate-dossier.schema';
import { DocumentsService } from './documents/documents.service';
import { DocumentsController } from './documents/documents.controller';
import { AlertsService } from './alerts/alerts.service';
import { AlertsController } from './alerts/alerts.controller';
import { CsvExportService } from './exports/csv-export.service';
import { ExportsController } from './exports/exports.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobDocument.name, schema: JobDocumentSchema },
      { name: AlertSubscription.name, schema: AlertSubscriptionSchema },
      { name: Job.name, schema: JobSchema },
      { name: CandidateDossier.name, schema: CandidateDossierSchema },
    ]),
    AuthModule,
  ],
  providers: [
    DocumentsService,
    AlertsService,
    CsvExportService,
  ],
  controllers: [
    DocumentsController,
    AlertsController,
    ExportsController,
  ],
  exports: [
    DocumentsService,
    AlertsService,
    CsvExportService,
  ],
})
export class OperationsModule {}
