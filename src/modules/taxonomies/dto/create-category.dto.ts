import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Staff Selection Commission' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ssc' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: 'Central examinations for ministries and departments' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'assignment_turned_in' })
  @IsString()
  @IsOptional()
  iconName?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
