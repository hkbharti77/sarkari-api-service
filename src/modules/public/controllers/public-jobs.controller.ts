import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicJobsService } from '../services/public-jobs.service';
import { PublicSearchQueryDto } from '../dto/public-search-query.dto';

@ApiTags('Public — BharatRojgar Job Search & Details')
@Controller('public/jobs')
export class PublicJobsController {
  constructor(private readonly publicJobsService: PublicJobsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search & filter public recruitment notifications',
    description:
      'Multi-faceted filtering across keywords, education tier, state code, category, and deadline status.',
  })
  @ApiResponse({ status: 200, description: 'Paginated job notifications with metadata' })
  async searchJobs(
    @Query() query: PublicSearchQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.publicJobsService.searchJobs(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get complete public bulletin and vacancy details by URL slug',
  })
  @ApiParam({
    name: 'slug',
    example: 'upsc-civil-services-prelims-2026',
    description: 'URL-friendly notification slug',
  })
  @ApiResponse({ status: 200, description: 'Complete official recruitment bulletin' })
  @ApiResponse({ status: 404, description: 'Recruitment notification not found or inactive' })
  async getJobBySlug(
    @Param('slug') slug: string,
  ): Promise<Record<string, unknown>> {
    return this.publicJobsService.findBySlug(slug);
  }
}
