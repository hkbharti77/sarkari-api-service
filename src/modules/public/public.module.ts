import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { PublicJobsService } from './services/public-jobs.service';
import { HomeSummaryService } from './services/home-summary.service';
import { PublicJobsController } from './controllers/public-jobs.controller';
import { PublicHomeController } from './controllers/public-home.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
  ],
  providers: [PublicJobsService, HomeSummaryService],
  controllers: [PublicJobsController, PublicHomeController],
  exports: [PublicJobsService, HomeSummaryService],
})
export class PublicModule {}
