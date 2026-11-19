import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertChannel } from '../schemas/alert-subscription.schema';

export class SubscribeAlertDto {
  @ApiProperty({
    example: 'candidate@example.com',
    description: 'Email address or mobile phone number (+919876543210)',
  })
  @IsString()
  @IsNotEmpty({ message: 'contactInfo is required' })
  contactInfo: string;

  @ApiProperty({
    enum: AlertChannel,
    example: AlertChannel.WHATSAPP,
    description: 'Preferred alert channel (WHATSAPP, TELEGRAM, EMAIL)',
  })
  @IsEnum(AlertChannel, {
    message: `channel must be one of: ${Object.values(AlertChannel).join(', ')}`,
  })
  channel: AlertChannel;

  @ApiPropertyOptional({
    example: 'UP',
    default: 'ALL',
    description: 'Filter alerts by state code (e.g. UP, BR, RJ, MP, DL, ALL)',
  })
  @IsString()
  @IsOptional()
  stateFilter?: string;

  @ApiPropertyOptional({
    example: 'SSC',
    default: 'ALL',
    description: 'Filter alerts by recruiting agency (e.g. UPSC, SSC, RRB, ALL)',
  })
  @IsString()
  @IsOptional()
  agencyFilter?: string;
}
