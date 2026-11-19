import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAdmitCardsDto {
  @ApiPropertyOptional({
    example: 'SSC',
    description: 'Filter by recruiting agency/commission (SSC, RRB, UPSC, IBPS, DEFENCE, STATE, NTA)',
  })
  @IsString()
  @IsOptional()
  agency?: string;

  @ApiPropertyOptional({
    example: 'Constable',
    description: 'Search across post title or department',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
