import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateStateDto {
  @ApiProperty({ example: 'UP' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Uttar Pradesh' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'uttar-pradesh' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Hindi' })
  @IsString()
  @IsNotEmpty()
  regionalLanguage: string;

  @ApiPropertyOptional({ example: ['UPSSSC', 'UPPSC', 'UPPRPB'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  commissions?: string[];

  @ApiPropertyOptional({ example: 'https://emblem.gov.in/up.png' })
  @IsUrl()
  @IsOptional()
  emblemUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
