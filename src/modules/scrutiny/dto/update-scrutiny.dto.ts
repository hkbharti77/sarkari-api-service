import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStatus, PIPELINE_STATUS_VALUES } from '../../jobs/schemas/job.schema';

class DocumentsUpdateDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  photoSignature?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  nationalId?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  degreeCertificate?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  categoryCertificate?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  feeReceipt?: boolean;
}

export class UpdateScrutinyDto {
  @ApiPropertyOptional({ description: 'Update document checklist flags (5-point checklist)' })
  @ValidateNested()
  @Type(() => DocumentsUpdateDto)
  @IsOptional()
  documents?: DocumentsUpdateDto;

  @ApiPropertyOptional({
    enum: PIPELINE_STATUS_VALUES,
    example: 'Admit Card / Active',
    description: 'New pipeline status after scrutiny decision',
  })
  @IsEnum(PIPELINE_STATUS_VALUES, {
    message: `status must be one of: ${PIPELINE_STATUS_VALUES.join(', ')}`,
  })
  @IsOptional()
  status?: PipelineStatus;

  @ApiPropertyOptional({
    example: 'All documents verified. Category certificate authentic.',
    description: 'Officer remarks — REQUIRED when rejecting (status = Rejected / Cancelled)',
  })
  @ValidateIf((o) => o.status === 'Rejected / Cancelled')
  @IsString()
  @IsNotEmpty({ message: 'scrutinyRemarks are mandatory when rejecting a candidate' })
  @IsOptional()
  scrutinyRemarks?: string;

  @ApiPropertyOptional({ example: 108.5, description: 'Written/objective score (set after exam)' })
  @IsNumber()
  @Min(0)
  @Max(500)
  @IsOptional()
  writtenScore?: number;
}
