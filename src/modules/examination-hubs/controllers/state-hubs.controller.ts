import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StateHubsService } from '../services/state-hubs.service';
import { StateJobsQueryDto } from '../dto/state-jobs-query.dto';

@ApiTags('Public — State Government Portals & Directory')
@Controller('public/state')
export class StateHubsController {
  constructor(private readonly stateHubsService: StateHubsService) {}

  @Get(':stateCode')
  @ApiOperation({
    summary: 'Get dedicated state government jobs directory & commission portals',
    description:
      'Returns state overview, domicile rules, state selection commissions (e.g. UPSSSC, BPSC, RPSC, MPPSC), and active vacancies for the state.',
  })
  @ApiParam({
    name: 'stateCode',
    example: 'UP',
    description: 'Two-letter state code: UP, BR, RJ, MP, DL, etc.',
  })
  @ApiResponse({ status: 200, description: 'State government hub metadata and job vacancies' })
  @ApiResponse({ status: 404, description: 'State not found' })
  async getStateHubData(
    @Param('stateCode') stateCode: string,
    @Query() query: StateJobsQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.stateHubsService.getStateHubData(stateCode, query);
  }
}
