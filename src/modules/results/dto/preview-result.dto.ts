import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PreviewResultQueryDto {
  @ApiPropertyOptional({ example: 92.5, description: 'UR cutoff score for preview' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  UR?: number;

  @ApiPropertyOptional({ example: 87.0, description: 'OBC cutoff score for preview' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  OBC?: number;

  @ApiPropertyOptional({ example: 78.5, description: 'SC cutoff score for preview' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  SC?: number;

  @ApiPropertyOptional({ example: 74.0, description: 'ST cutoff score for preview' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  ST?: number;

  @ApiPropertyOptional({ example: 85.0, description: 'EWS cutoff score for preview' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  EWS?: number;
}
