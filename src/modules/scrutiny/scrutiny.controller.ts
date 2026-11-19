import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { ScrutinyService } from './scrutiny.service';
import { UpdateScrutinyDto } from './dto/update-scrutiny.dto';
import { QueryScrutinyQueueDto } from './dto/query-scrutiny-queue.dto';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminRole } from '../auth/schemas/admin-user.schema';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Admin — Candidate Scrutiny Queue')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScrutinyController {
  constructor(private readonly scrutinyService: ScrutinyService) {}

  // ─── GET /admin/scrutiny-queue ────────────────────────────────────────────

  @Get('scrutiny-queue')
  @ApiOperation({
    summary: 'Query the candidate dossier scrutiny queue',
    description:
      'Filter by advtId, status, category, or search by name/rollNumber. ' +
      'Returns dossiers with isCompliant flag pre-computed from the 5-point checklist.',
  })
  @ApiResponse({ status: 200, description: 'Paginated scrutiny queue with compliance annotations' })
  async getScrutinyQueue(@Query() query: QueryScrutinyQueueDto): Promise<Record<string, unknown>> {
    return this.scrutinyService.findQueue(query);
  }

  // ─── PATCH /admin/candidates/:rollNumber/scrutiny ─────────────────────────

  @Patch('candidates/:rollNumber/scrutiny')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SCRUTINY_OFFICER, AdminRole.REVIEWER)
  @ApiParam({ name: 'rollNumber', description: 'Candidate roll number (e.g. 2608119402)' })
  @ApiOperation({
    summary: '[SCRUTINY_OFFICER] Update document flags, approve or reject a candidate dossier',
    description:
      'Approving (status = "Admit Card / Active") requires all 5 document checks to pass. ' +
      'Rejecting (status = "Rejected / Cancelled") requires scrutinyRemarks. ' +
      'On approval: job.admitCardsReleased++ and job.scrutinyPending--.',
  })
  @ApiResponse({ status: 200, description: 'Updated dossier document' })
  @ApiResponse({ status: 400, description: 'Checklist not satisfied or missing remarks' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async updateScrutiny(
    @Param('rollNumber') rollNumber: string,
    @Body() dto: UpdateScrutinyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scrutinyService.updateScrutiny(rollNumber, dto, user.email, user.role);
  }

  // ─── POST /admin/candidates/bulk-verify ──────────────────────────────────

  @Post('candidates/bulk-verify')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SCRUTINY_OFFICER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SCRUTINY_OFFICER, SUPER_ADMIN] Batch-approve compliant dossiers',
    description:
      'Accepts up to 100 roll numbers. Skips any that are not in "Pending / Scrutiny" ' +
      'status or whose 5-point checklist is not fully satisfied. ' +
      'Returns a summary with per-rollNumber status and reason.',
  })
  @ApiResponse({ status: 200, description: 'Bulk verify result with approved/skipped summary' })
  async bulkVerify(
    @Body() dto: BulkVerifyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scrutinyService.bulkVerify(dto, user.email, user.role);
  }
}
