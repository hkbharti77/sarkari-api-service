import {
  Controller,
  Get,
  Post,
  Patch,
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

import { JobsService } from '../services/jobs.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { QueryJobDto } from '../dto/query-job.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdminRole } from '../../auth/schemas/admin-user.schema';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

@ApiTags('Admin — Requisition Management')
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminJobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ─── POST /admin/jobs ─────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[PUBLISHER, EDITOR, SUPER_ADMIN] Create new recruitment notification',
    description:
      'Submitting vacancies auto-calculates the statutory category breakdown ' +
      '(OBC 27%, SC 15%, ST 7.5%, EWS 10%, UR residual). No manual breakdown needed.',
  })
  @ApiResponse({ status: 201, description: 'Job created with auto-calculated quotas' })
  @ApiResponse({ status: 409, description: 'customId or slug already exists' })
  async createJob(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.create(dto, user.email, user.role);
  }

  // ─── GET /admin/jobs ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List & search requisitions',
    description: 'Filter by status, department, keyword, stateCode, educationTier, isTrending. Paginated.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of requisitions with meta' })
  async getJobs(@Query() query: QueryJobDto) {
    return this.jobsService.findAll(query);
  }

  // ─── GET /admin/jobs/:id ──────────────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the job' })
  @ApiOperation({ summary: 'Get complete requisition details by ID' })
  @ApiResponse({ status: 200, description: 'Full job document' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobById(@Param('id') id: string) {
    return this.jobsService.findById(id);
  }

  // ─── PATCH /admin/jobs/:id ────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER, AdminRole.EDITOR, AdminRole.REVIEWER)
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the job to update' })
  @ApiOperation({
    summary: '[PUBLISHER, EDITOR, REVIEWER, SUPER_ADMIN] Update requisition or advance pipeline',
    description:
      'If vacancies are updated, category breakdown is automatically recalculated. ' +
      'Use status field to advance: "Pending / Scrutiny" → "Admit Card / Active" → "Result Announced".',
  })
  @ApiResponse({ status: 200, description: 'Updated job document' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async updateJob(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.update(id, dto, user.email, user.role);
  }
}
