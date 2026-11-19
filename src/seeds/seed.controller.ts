import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('Admin — Master Database Seeding')
@Controller('admin')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('seed-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[DEV/SETUP] Complete Master Database Seeder',
    description:
      'Seeds all taxonomies, default super admin, 7 master recruitment notifications, ' +
      'candidate scrutiny dossiers, and audit log history matching the prototype UI.',
  })
  @ApiResponse({ status: 200, description: 'Seeding executed successfully' })
  async seedAll(): Promise<Record<string, unknown>> {
    return this.seedService.seedAll();
  }
}
