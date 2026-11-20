import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AiExtractJobDto {
  @ApiPropertyOptional({ description: 'Raw copied text of the recruitment notification' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'Base64 encoded PDF file content' })
  @IsString()
  @IsOptional()
  pdfBase64?: string;

  @ApiPropertyOptional({ description: 'MIME type of uploaded file (e.g. application/pdf, text/plain)' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Optional user-provided Gemini API Key override' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Whether to auto-save extracted job directly into MongoDB as an internal draft (default true)' })
  @IsBoolean()
  @IsOptional()
  autoSaveDraft?: boolean;

  @ApiPropertyOptional({ description: 'Whether to bypass Redis/AI cache and force fresh re-extraction from LLM' })
  @IsBoolean()
  @IsOptional()
  forceRefresh?: boolean;
}
