import { IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CutoffMarksDto {
  @ApiProperty({ example: 92.5, description: 'UR category minimum cutoff score' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  UR: number;

  @ApiProperty({ example: 87.0, description: 'OBC category minimum cutoff score' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  OBC: number;

  @ApiProperty({ example: 78.5, description: 'SC category minimum cutoff score' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  SC: number;

  @ApiProperty({ example: 74.0, description: 'ST category minimum cutoff score' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ST: number;

  @ApiProperty({ example: 85.0, description: 'EWS category minimum cutoff score' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  EWS: number;
}

export class PublishCutoffsDto {
  @ApiProperty({ example: 'UPSC-CSE-2026-01', description: 'Notification ID (Job customId)' })
  @IsString()
  @IsNotEmpty()
  notificationId: string;

  @ApiProperty({ type: CutoffMarksDto, description: 'Category-wise cutoff scores' })
  @ValidateNested()
  @Type(() => CutoffMarksDto)
  cutoffMarks: CutoffMarksDto;

  @ApiProperty({ example: 'GSR-412(E)/2026', description: 'Official gazette reference code' })
  @IsString()
  @IsNotEmpty()
  gazetteRef: string;
}
