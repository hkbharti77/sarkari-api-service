import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CsvExportService } from './csv-export.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminRole } from '../../auth/schemas/admin-user.schema';

@ApiTags('Admin — Auditing & Streaming CSV Exports')
@Controller('admin/export')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private readonly csvExportService: CsvExportService) {}

  @Get('csv')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER, AdminRole.REVIEWER, AdminRole.SCRUTINY_OFFICER)
  @ApiOperation({
    summary: 'Streaming CSV export for notifications or candidate rosters',
    description:
      'Zero-RAM streaming export powered by MongoDB cursors. ' +
      'Transforms thousands of records into chunked CSV with UTF-8 BOM encoding for Excel.',
  })
  @ApiProduces('text/csv')
  @ApiQuery({
    name: 'type',
    enum: ['requisitions', 'candidates'],
    example: 'requisitions',
    description: 'Data model to export',
  })
  @ApiQuery({
    name: 'advtId',
    required: false,
    example: 'UPSC-CSE-2026-01',
    description: 'Filter by advertisement customId',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'Admit Card / Active',
    description: 'Filter by pipeline status',
  })
  @ApiResponse({
    status: 200,
    description: 'Streaming text/csv attachment',
  })
  async exportCsv(
    @Query('type') type: 'requisitions' | 'candidates',
    @Query('advtId') advtId: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    return this.csvExportService.streamCsvExport({ type, advtId, status }, res);
  }
}
