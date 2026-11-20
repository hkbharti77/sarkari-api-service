import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdmitCardsService } from '../services/admit-cards.service';
import { QueryAdmitCardsDto } from '../dto/query-admit-cards.dto';
import { PublicCacheInterceptor } from '../../../cache/cache-invalidation.interceptor';
import { PublicRateLimiterGuard } from '../../../common/guards/public-rate-limiter.guard';

@ApiTags('Public — Admit Cards & Examination Entry Passes')
@Controller('public/admit-cards')
@UseGuards(PublicRateLimiterGuard)
@UseInterceptors(PublicCacheInterceptor)
export class AdmitCardsController {
  constructor(private readonly admitCardsService: AdmitCardsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get active hall tickets, admit cards, and regional examination gateways',
    description:
      'Lists notifications in "Admit Card / Active" status with regional commission links and shift details.',
  })
  @ApiResponse({ status: 200, description: 'Paginated active admit cards list' })
  async getAdmitCards(
    @Query() query: QueryAdmitCardsDto,
  ): Promise<Record<string, unknown>> {
    return this.admitCardsService.getAdmitCards(query);
  }
}
