import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { State, StateSchema } from '../taxonomies/schemas/state.schema';
import { AdmitCardsService } from './services/admit-cards.service';
import { ResultsHubService } from './services/results-hub.service';
import { StateHubsService } from './services/state-hubs.service';
import { AdmitCardsController } from './controllers/admit-cards.controller';
import { ResultsHubController } from './controllers/results-hub.controller';
import { StateHubsController } from './controllers/state-hubs.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: State.name, schema: StateSchema },
    ]),
  ],
  providers: [
    AdmitCardsService,
    ResultsHubService,
    StateHubsService,
  ],
  controllers: [
    AdmitCardsController,
    ResultsHubController,
    StateHubsController,
  ],
  exports: [
    AdmitCardsService,
    ResultsHubService,
    StateHubsService,
  ],
})
export class ExaminationHubsModule {}
