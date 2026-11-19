import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { OrganizationType } from '../schemas/organization.schema';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Staff Selection Commission' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SSC' })
  @IsString()
  @IsNotEmpty()
  shortName: string;

  @ApiProperty({ example: 'ssc' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.CENTRAL })
  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ApiProperty({ example: 'Government of India' })
  @IsString()
  @IsNotEmpty()
  jurisdiction: string;

  @ApiProperty({ example: 'https://ssc.gov.in' })
  @IsUrl()
  @IsNotEmpty()
  officialWebsite: string;

  @ApiPropertyOptional({ example: 'https://cdn.govjob.in/logos/ssc.png' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
