import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdmitCardsService } from '../services/admit-cards.service';
import { QueryAdmitCardsDto } from '../dto/query-admit-cards.dto';

@ApiTags('Public — Admit Cards & Examination Entry Passes')
@Controller('public/admit-cards')
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
