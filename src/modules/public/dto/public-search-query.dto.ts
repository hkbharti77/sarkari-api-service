import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum QualificationTier {
  TENTH = '10th',
  TWELFTH = '12th',
  GRADUATE = 'Graduate',
  ENGINEERING = 'Engineering',
  DIPLOMA_ITI = 'Diploma_ITI',
  POST_GRADUATE = 'PostGraduate',
}

export enum PublicJobSortOption {
  DEADLINE_ASC = 'deadline_asc',
  NEWEST = 'newest',
  VACANCIES_DESC = 'vacancies_desc',
  PAY_DESC = 'pay_desc',
}

export class PublicSearchQueryDto {
  @ApiPropertyOptional({ example: 'Inspector', description: 'Search term across title, department, advertisement no.' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: QualificationTier, example: QualificationTier.GRADUATE, description: 'Minimum qualification level' })
  @IsEnum(QualificationTier)
  @IsOptional()
  qualification?: QualificationTier;

  @ApiPropertyOptional({ example: 'UP', description: 'State code (e.g. ALL, UP, BR, RJ, MP, DL)' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'UPSC', description: 'Commission / agency category (UPSC, SSC, Railway, IBPS, Defence)' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'OPEN', enum: ['OPEN', 'CLOSING_SOON', 'CLOSED'], description: 'Application deadline status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: PublicJobSortOption, example: PublicJobSortOption.DEADLINE_ASC, description: 'Sorting order' })
  @IsEnum(PublicJobSortOption)
  @IsOptional()
  sort?: PublicJobSortOption;

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
