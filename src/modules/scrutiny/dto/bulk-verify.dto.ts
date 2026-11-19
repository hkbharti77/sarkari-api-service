import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkVerifyDto {
  @ApiProperty({
    type: [String],
    example: ['2608119402', '2608119403', '2608119404'],
    description: 'Array of roll numbers to bulk-verify (max 100 per request)',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least 1 roll number required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 roll numbers per bulk-verify request' })
  rollNumbers: string[];
}
