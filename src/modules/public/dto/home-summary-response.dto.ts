import { ApiProperty } from '@nestjs/swagger';

export class TrendingTickerDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'SSC GD Constable 2025' })
  title: string;

  @ApiProperty({ example: 'CR, NR, WR, ER, & SR Regions live for hall ticket generation' })
  detail: string;

  @ApiProperty({ example: 'HIGH', enum: ['HIGH', 'NORMAL'] })
  urgency: 'HIGH' | 'NORMAL';

  @ApiProperty({ example: 'ssc-gd-constable-2025', required: false })
  slug?: string;

  @ApiProperty({ example: 'https://ssc.gov.in', required: false })
  url?: string;
}

export class HomeSummaryResponseDto {
  @ApiProperty({ example: 42850 })
  totalVacancies: number;

  @ApiProperty({ example: 14 })
  admitCardsToday: number;

  @ApiProperty({ example: 8 })
  resultsPast24h: number;

  @ApiProperty({ example: '12 Mins Ago' })
  lastGazetteSyncTime: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ type: [TrendingTickerDto] })
  trendingTickers: TrendingTickerDto[];
}
