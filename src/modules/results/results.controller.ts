import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResultsService } from './services/results.service';
import { PublishCutoffsDto } from './dto/publish-cutoffs.dto';
import { PreviewResultQueryDto } from './dto/preview-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminRole } from '../auth/schemas/admin-user.schema';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Admin — Results & Cutoffs Publishing')
@Controller('admin/results')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get('preview/:notificationId')
  @ApiOperation({
    summary: 'Preview candidate qualification metrics based on trial cutoffs',
    description:
      'Evaluates candidate scores against query-provided cutoffs (or existing cutoffs) ' +
      'without mutating any database records.',
  })
  @ApiParam({
    name: 'notificationId',
    example: 'UPSC-CSE-2026-01',
    description: 'Notification customId or MongoDB ID',
  })
  @ApiResponse({ status: 200, description: 'Evaluation statistics breakdown' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async previewResults(
    @Param('notificationId') notificationId: string,
    @Query() query: PreviewResultQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.resultsService.previewResults(notificationId, query);
  }

  @Post('publish')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[PUBLISHER, SUPER_ADMIN] Declare official cutoffs & publish merit results',
    description:
      'Sets official category cutoff marks, transitions Job status to "Result Announced", ' +
      'marks qualified candidate dossiers, and writes an immutable audit log.',
  })
  @ApiResponse({ status: 200, description: 'Results declared and job advanced' })
  @ApiResponse({ status: 400, description: 'Invalid notification status or payload' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async publishResults(
    @Body() dto: PublishCutoffsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Record<string, unknown>> {
    return this.resultsService.publishResults(dto, user.email, user.role);
  }
}
