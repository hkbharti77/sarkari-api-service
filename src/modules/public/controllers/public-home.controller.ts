import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HomeSummaryService } from '../services/home-summary.service';
import { HomeSummaryResponseDto } from '../dto/home-summary-response.dto';

@ApiTags('Public — BharatRojgar Home & Tickers')
@Controller('public')
export class PublicHomeController {
  constructor(private readonly homeSummaryService: HomeSummaryService) {}

  @Get('home-summary')
  @ApiOperation({
    summary: 'Public real-time statistics & trending tickers for homepage',
    description:
      'Aggregates total live vacancies, active hall ticket releases, published results, and live tickers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Home summary metrics',
    type: HomeSummaryResponseDto,
  })
  async getHomeSummary(): Promise<HomeSummaryResponseDto> {
    return this.homeSummaryService.getHomeSummary();
  }
}
