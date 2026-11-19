import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { SubscribeAlertDto } from './dto/subscribe-alert.dto';

@ApiTags('Public — Instant Job Alerts & Subscriptions')
@Controller('public/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Subscribe to instant recruitment alerts (WhatsApp / Telegram / Email)',
    description:
      'Stores candidate preference with duplicate protection. ' +
      'Allows state and agency filters (e.g. UP, SSC, ALL).',
  })
  @ApiResponse({ status: 201, description: 'Subscription created or refreshed' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async subscribe(
    @Body() dto: SubscribeAlertDto,
  ): Promise<Record<string, unknown>> {
    return this.alertsService.subscribe(dto);
  }
}
