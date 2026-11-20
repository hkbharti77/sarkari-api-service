import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { AiExtractionService } from '../services/ai-extraction.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { QueryJobDto } from '../dto/query-job.dto';
import { AiExtractJobDto } from '../dto/ai-extract.dto';
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
  constructor(
    private readonly jobsService: JobsService,
    private readonly aiExtractionService: AiExtractionService,
  ) {}

  // ─── POST /admin/jobs/ai-extract ──────────────────────────────────────────

  @Post('ai-extract')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[PUBLISHER, EDITOR, SUPER_ADMIN] Extract structured job details from PDF or text using Gemini LLM',
    description:
      'Parses advertisement number, post title, department, vacancies, deadlines, fees, qualifications, and FAQs into structured form fields.',
  })
  @ApiResponse({ status: 200, description: 'Structured job details extracted and auto-saved to DB as draft' })
  @ApiResponse({ status: 400, description: 'Missing text or file payload, or invalid API key' })
  async extractJobAi(
    @Body() dto: AiExtractJobDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const extracted = await this.aiExtractionService.extractJobData(dto);

    // Option B: Direct DB Auto-Save (default true)
    // Automatically creates an internal Draft in MongoDB with status: 'Pending / Scrutiny'
    let draftJob: any = null;
    if (dto.autoSaveDraft !== false) {
      draftJob = await this.jobsService.createDraftFromExtraction(
        extracted,
        user?.email || 'admin@govjob.internal',
        user?.role || AdminRole.SUPER_ADMIN,
      );
    }

    return {
      ...extracted,
      draftJob: draftJob
        ? {
            ...draftJob,
            _id: draftJob._id?.toString() || draftJob.id,
          }
        : undefined,
    };
  }

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

  // ─── DELETE /admin/jobs/:id ───────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER)
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId or customId of the job to delete' })
  @ApiOperation({
    summary: '[SUPER_ADMIN, PUBLISHER] Permanently delete a requisition',
    description: 'Deletes the specified requisition and logs the deletion in the immutable audit trail.',
  })
  @ApiResponse({ status: 200, description: 'Requisition deleted successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async deleteJob(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobsService.delete(id, user.email, user.role);
  }
}
