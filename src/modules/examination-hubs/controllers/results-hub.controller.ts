import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResultsHubService } from '../services/results-hub.service';
import { QueryResultsDto } from '../dto/query-results.dto';

@ApiTags('Public — Examination Results & Official Cutoffs')
@Controller('public/results')
export class ResultsHubController {
  constructor(private readonly resultsHubService: ResultsHubService) {}

  @Get()
  @ApiOperation({
    summary: 'Get published examination results, merit lists, and category cutoffs',
    description:
      'Lists notifications in "Result Announced" status with statutory category cutoffs (UR/OBC/SC/ST/EWS).',
  })
  @ApiResponse({ status: 200, description: 'Paginated examination results with cutoffs' })
  async getPublishedResults(
    @Query() query: QueryResultsDto,
  ): Promise<Record<string, unknown>> {
    return this.resultsHubService.getPublishedResults(query);
  }
}
