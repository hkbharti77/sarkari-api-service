import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KpiService } from '../services/kpi.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('KPI Dashboard')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('kpis')
  @ApiOperation({
    summary: 'Real-time KPI strip — total vacancies, pipeline counts, scrutiny queue depth',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns aggregated KPI summary from live MongoDB data',
  })
  async getKpis() {
    return this.kpiService.computeKpis();
  }
}
