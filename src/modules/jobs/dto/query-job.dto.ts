import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStatus, PIPELINE_STATUS_VALUES } from '../schemas/job.schema';

export class QueryJobDto {
  @ApiPropertyOptional({
    enum: PIPELINE_STATUS_VALUES,
    example: 'Admit Card / Active',
    description: 'Filter by pipeline status',
  })
  @IsEnum(PIPELINE_STATUS_VALUES, {
    message: `status must be one of: ${PIPELINE_STATUS_VALUES.join(', ')}`,
  })
  @IsOptional()
  status?: PipelineStatus;

  @ApiPropertyOptional({ example: 'UPSC', description: 'Filter by department (partial match)' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'civil services', description: 'Full-text keyword search on postTitle & department' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ example: 'UP', description: 'Filter by state code ("ALL" returns all)' })
  @IsString()
  @IsOptional()
  stateCode?: string;

  @ApiPropertyOptional({ example: 'Graduate', description: 'Filter by education tier' })
  @IsString()
  @IsOptional()
  educationTier?: string;

  @ApiPropertyOptional({ example: false, description: 'Filter trending jobs only' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isTrending?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Results per page (max 100)' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'deadlineDate', description: 'Sort field' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], description: 'Sort direction' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
