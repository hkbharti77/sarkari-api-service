import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  Min,
  Matches,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStatus, PIPELINE_STATUS_VALUES } from '../schemas/job.schema';
import { ApplicationFeesDto, PostBreakdownItemDto, JobFaqDto } from './create-job.dto';

class CategoryBreakdownUpdateDto {
  @IsNumber() @Min(0) @IsOptional() UR?: number;
  @IsNumber() @Min(0) @IsOptional() OBC?: number;
  @IsNumber() @Min(0) @IsOptional() SC?: number;
  @IsNumber() @Min(0) @IsOptional() ST?: number;
  @IsNumber() @Min(0) @IsOptional() EWS?: number;
}

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Advt. No. 05/2026-CSP' })
  @IsString()
  @IsOptional()
  advtNo?: string;

  @ApiPropertyOptional({ example: 'Union Public Service Commission (UPSC)' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'Civil Services (Preliminary) Examination 2026 — Updated' })
  @IsString()
  @IsOptional()
  postTitle?: string;

  @ApiPropertyOptional({ example: 'DoPT · All India Services (Revised)' })
  @IsString()
  @IsOptional()
  ministryCode?: string;

  @ApiPropertyOptional({ example: 'Level-10 (₹56,100 – ₹1,77,500)' })
  @IsString()
  @IsOptional()
  payLevel?: string;

  @ApiPropertyOptional({ example: 1200, description: 'Updated total vacancies' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  vacancies?: number;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => Boolean(o.startDate && o.startDate.trim().length > 0))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => Boolean(o.deadlineDate && o.deadlineDate.trim().length > 0))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'deadlineDate must be in YYYY-MM-DD format' })
  deadlineDate?: string;

  @ApiPropertyOptional({ example: 'GSR-412(E)/2026' })
  @IsString()
  @IsOptional()
  gazetteRef?: string;

  @ApiPropertyOptional({ example: 'UPSC-CSE-2026-01' })
  @IsString()
  @IsOptional()
  customId?: string;

  @ApiPropertyOptional({ example: 'ALL' })
  @IsString()
  @IsOptional()
  stateCode?: string;

  @ApiPropertyOptional({ example: 'Graduate' })
  @IsString()
  @IsOptional()
  educationTier?: string;

  @IsString()
  @IsOptional()
  mongoId?: string;

  @IsString()
  @IsOptional()
  _id?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ example: '2027-01-10' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => Boolean(o.examDate && o.examDate.trim().length > 0))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'examDate must be in YYYY-MM-DD format' })
  examDate?: string;

  @ApiPropertyOptional({
    enum: PIPELINE_STATUS_VALUES,
    example: 'Admit Card / Active',
    description: 'Advance pipeline status',
  })
  @IsEnum(PIPELINE_STATUS_VALUES, {
    message: `status must be one of: ${PIPELINE_STATUS_VALUES.join(', ')}`,
  })
  @IsOptional()
  status?: PipelineStatus;

  @ApiPropertyOptional({ description: 'Category-wise vacancy breakdown (UR, OBC, SC, ST, EWS)' })
  @ValidateNested()
  @Type(() => CategoryBreakdownUpdateDto)
  @IsOptional()
  categoryBreakdown?: CategoryBreakdownUpdateDto;

  @ApiPropertyOptional({ description: 'Override category-wise cutoff marks after evaluation' })
  @ValidateNested()
  @Type(() => CategoryBreakdownUpdateDto)
  @IsOptional()
  cutoffMarks?: CategoryBreakdownUpdateDto;

  @ApiPropertyOptional({ example: 500, description: 'Number of admit cards released' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  admitCardsReleased?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Total applications received' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  applicationsReceived?: number;

  @ApiPropertyOptional({ example: 120, description: 'Applications pending scrutiny' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  scrutinyPending?: number;

  @ApiPropertyOptional({ example: 'https://upsc.gov.in' })
  @IsString()
  @IsOptional()
  officialWebsiteUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsconline.nic.in' })
  @IsString()
  @IsOptional()
  applyOnlineUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsc.gov.in/revised-notice.pdf' })
  @IsString()
  @IsOptional()
  officialNoticePdfUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsconline.nic.in/admitcard.html' })
  @IsString()
  @IsOptional()
  admitCardUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsconline.nic.in/answerkey.pdf' })
  @IsString()
  @IsOptional()
  answerKeyUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsc.gov.in/syllabus.pdf' })
  @IsString()
  @IsOptional()
  syllabusUrl?: string;

  @ApiPropertyOptional({ example: ['Stage 1: CBT', 'Stage 2: DV'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectionStages?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isTrending?: boolean;

  @ApiPropertyOptional({ type: ApplicationFeesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicationFeesDto)
  applicationFees?: ApplicationFeesDto;

  @ApiPropertyOptional({ example: 'Bachelor Degree in Any Stream' })
  @IsString()
  @IsOptional()
  qualificationSummary?: string;

  @ApiPropertyOptional({ example: '18 to 32 Years as on 01/08/2026' })
  @IsString()
  @IsOptional()
  ageLimitSummary?: string;

  @ApiPropertyOptional({ type: [PostBreakdownItemDto] })
  @IsOptional()
  @Type(() => PostBreakdownItemDto)
  postBreakdown?: PostBreakdownItemDto[];

  @ApiPropertyOptional({ example: 'Updated official job overview...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [JobFaqDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobFaqDto)
  faqs?: JobFaqDto[];
}
