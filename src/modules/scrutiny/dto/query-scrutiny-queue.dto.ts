import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStatus, PIPELINE_STATUS_VALUES } from '../../jobs/schemas/job.schema';
import { ReservationCategory, RESERVATION_CATEGORIES } from '../schemas/candidate-dossier.schema';

export class QueryScrutinyQueueDto {
  @ApiPropertyOptional({
    example: 'UPSC-CSE-2026-01',
    description: 'Filter by advertisement ID (Job customId)',
  })
  @IsString()
  @IsOptional()
  advtId?: string;

  @ApiPropertyOptional({
    enum: PIPELINE_STATUS_VALUES,
    example: 'Pending / Scrutiny',
    description: 'Filter by pipeline status',
  })
  @IsEnum(PIPELINE_STATUS_VALUES, {
    message: `status must be one of: ${PIPELINE_STATUS_VALUES.join(', ')}`,
  })
  @IsOptional()
  status?: PipelineStatus;

  @ApiPropertyOptional({
    enum: RESERVATION_CATEGORIES,
    example: 'OBC',
    description: 'Filter by reservation category',
  })
  @IsEnum(RESERVATION_CATEGORIES, {
    message: `category must be one of: ${RESERVATION_CATEGORIES.join(', ')}`,
  })
  @IsOptional()
  category?: ReservationCategory;

  @ApiPropertyOptional({
    example: 'Arundhati',
    description: 'Search by candidate name, roll number, or registration ID',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
