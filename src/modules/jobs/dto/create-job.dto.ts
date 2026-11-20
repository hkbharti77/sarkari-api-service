import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  ValidateNested,
  ValidateIf,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStatus, PIPELINE_STATUS_VALUES } from '../schemas/job.schema';

export class ApplicationFeesDto {
  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  general?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  obc?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  scSt?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  female?: number;

  @ApiPropertyOptional({ example: 'Online via Net Banking, Debit / Credit Card, or UPI' })
  @IsString()
  @IsOptional()
  paymentMode?: string;
}

export class CategoryBreakdownDto {
  @ApiPropertyOptional({ example: 450, description: 'Unreserved (UR) category vacancies' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  UR?: number;

  @ApiPropertyOptional({ example: 280, description: 'Other Backward Classes (OBC) vacancies' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  OBC?: number;

  @ApiPropertyOptional({ example: 150, description: 'Scheduled Castes (SC) vacancies' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  SC?: number;

  @ApiPropertyOptional({ example: 75, description: 'Scheduled Tribes (ST) vacancies' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  ST?: number;

  @ApiPropertyOptional({ example: 100, description: 'Economically Weaker Sections (EWS) vacancies' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  EWS?: number;
}

export class PostBreakdownItemDto {
  @ApiProperty({ example: 'Station Master' })
  @IsString()
  @IsNotEmpty()
  postName: string;

  @ApiProperty({ example: 994 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  vacancies: number;

  @ApiProperty({ example: 'Graduate Degree in Any Stream' })
  @IsString()
  @IsNotEmpty()
  qualification: string;
}

export class JobFaqDto {
  @ApiProperty({ example: 'What is the required educational qualification?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: 'Bachelor Degree in any discipline from a recognized University.' })
  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CreateJobDto {
  @ApiProperty({ example: 'UPSC-CSE-2026-01', description: 'Unique custom notification ID' })
  @IsString()
  @IsNotEmpty()
  customId: string;

  @ApiProperty({ example: 'Advt. No. 05/2026-CSP', description: 'Official gazette advertisement number' })
  @IsString()
  @IsNotEmpty()
  advtNo: string;

  @ApiProperty({ example: 'Civil Services (Preliminary) Examination 2026', description: 'Full post/exam title' })
  @IsString()
  @IsNotEmpty()
  postTitle: string;

  @ApiPropertyOptional({ example: 'upsc-civil-services-prelims-2026', description: 'URL slug (auto-generated from postTitle if omitted)' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Union Public Service Commission (UPSC)', description: 'Recruiting department/organization' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiPropertyOptional({ example: 'DoPT · All India Services', description: 'Ministry / cadre code' })
  @IsString()
  @IsOptional()
  ministryCode?: string;

  @ApiPropertyOptional({ example: 'Level-10 (₹56,100 – ₹1,77,500)', description: 'Pay matrix level' })
  @IsString()
  @IsOptional()
  payLevel?: string;

  @ApiProperty({ example: 1056, description: 'Total advertised vacancies' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  vacancies: number;

  @ApiPropertyOptional({ type: CategoryBreakdownDto, description: 'Statutory category-wise seat matrix (UR, OBC, SC, ST, EWS)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryBreakdownDto)
  categoryBreakdown?: CategoryBreakdownDto;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Application opening / gazette release date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => Boolean(o.startDate && o.startDate.trim().length > 0))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-11-28', description: 'Application deadline date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => Boolean(o.deadlineDate && o.deadlineDate.trim().length > 0))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'deadlineDate must be in YYYY-MM-DD format' })
  deadlineDate?: string;

  @ApiPropertyOptional({ example: '2026-12-20', description: 'Exam date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => Boolean(o.examDate && o.examDate.trim().length > 0))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'examDate must be in YYYY-MM-DD format' })
  examDate?: string;

  @ApiPropertyOptional({ example: 'GSR-412(E)/2026', description: 'Official gazette notification reference' })
  @IsString()
  @IsOptional()
  gazetteRef?: string;

  @ApiPropertyOptional({
    enum: PIPELINE_STATUS_VALUES,
    example: 'Pending / Scrutiny',
    description: 'Pipeline status',
  })
  @IsEnum(PIPELINE_STATUS_VALUES, {
    message: `status must be one of: ${PIPELINE_STATUS_VALUES.join(', ')}`,
  })
  @IsOptional()
  status?: PipelineStatus;

  @ApiPropertyOptional({ example: 'https://upsc.gov.in', description: 'Official recruiting body website' })
  @IsString()
  @IsOptional()
  officialWebsiteUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsconline.nic.in', description: 'Official apply online portal URL' })
  @IsString()
  @IsOptional()
  applyOnlineUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsc.gov.in/notice.pdf', description: 'Official notice PDF URL' })
  @IsString()
  @IsOptional()
  officialNoticePdfUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsconline.nic.in/admitcard.html', description: 'Direct Admit Card / Hall Ticket Download URL' })
  @IsString()
  @IsOptional()
  admitCardUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsconline.nic.in/answerkey.pdf', description: 'Direct Answer Key & Objection Tracker URL' })
  @IsString()
  @IsOptional()
  answerKeyUrl?: string;

  @ApiPropertyOptional({ example: 'https://upsc.gov.in/syllabus.pdf', description: 'Official Syllabus & Exam Scheme PDF URL' })
  @IsString()
  @IsOptional()
  syllabusUrl?: string;

  @ApiPropertyOptional({
    example: ['Stage 1: Preliminary Exam', 'Stage 2: Main Exam', 'Stage 3: Interview'],
    description: 'Custom stages of examination & selection process',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectionStages?: string[];

  @ApiPropertyOptional({ example: 'ALL', description: 'State code applicability ("ALL" or state code like "UP")' })
  @IsString()
  @IsOptional()
  stateCode?: string;

  @ApiPropertyOptional({ example: 'Graduate', description: 'Education tier required (10th, 12th, Graduate, Engineering, etc.)' })
  @IsString()
  @IsOptional()
  educationTier?: string;

  @ApiPropertyOptional({ example: false, description: 'Mark as trending on BharatRojgar homepage' })
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostBreakdownItemDto)
  postBreakdown?: PostBreakdownItemDto[];

  @ApiPropertyOptional({
    example: 'Official recruitment notification issued under the authority of Union Public Service Commission...',
    description: 'Detailed recruitment overview and job description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: [JobFaqDto],
    description: 'Frequently Asked Questions (FAQs) for candidates',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobFaqDto)
  faqs?: JobFaqDto[];
}
