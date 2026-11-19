import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TaxonomiesService } from './taxonomies.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateStateDto } from './dto/create-state.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../auth/schemas/admin-user.schema';

@ApiTags('Taxonomies')
@Controller()
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  // -------------------------------------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------------------------------------

  @Get('public/organizations')
  @ApiOperation({ summary: 'List all active recruiting commissions and organizations' })
  @SwaggerResponse({ status: 200, description: 'List of active organizations' })
  async getOrganizations() {
    return this.taxonomiesService.findAllOrganizations();
  }

  @Get('public/organizations/:slug')
  @ApiOperation({ summary: 'Get organization details by slug' })
  async getOrganizationBySlug(@Param('slug') slug: string) {
    return this.taxonomiesService.findOrganizationBySlug(slug);
  }

  @Get('public/categories')
  @ApiOperation({ summary: 'List all active job categories and fast-filter chips' })
  @SwaggerResponse({ status: 200, description: 'List of recruitment categories' })
  async getCategories() {
    return this.taxonomiesService.findAllCategories();
  }

  @Get('public/states')
  @ApiOperation({ summary: 'List all configured state government job hubs' })
  @SwaggerResponse({ status: 200, description: 'List of state hubs' })
  async getStates() {
    return this.taxonomiesService.findAllStates();
  }

  @Get('public/states/:code')
  @ApiOperation({ summary: 'Get state hub configuration by state code (e.g. UP, BR, RJ)' })
  async getStateByCode(@Param('code') code: string) {
    return this.taxonomiesService.findStateByCode(code);
  }

  // -------------------------------------------------------------
  // ADMIN CONFIGURATION ENDPOINTS (Protected with JWT & RBAC)
  // -------------------------------------------------------------

  @Post('admin/organizations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[SUPER_ADMIN, PUBLISHER] Create a new recruiting organization' })
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.taxonomiesService.createOrganization(dto);
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[SUPER_ADMIN, PUBLISHER] Create a new recruitment category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.taxonomiesService.createCategory(dto);
  }

  @Post('admin/states')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[SUPER_ADMIN, PUBLISHER] Create a new state portal configuration' })
  async createState(@Body() dto: CreateStateDto) {
    return this.taxonomiesService.createState(dto);
  }

  @Post('admin/taxonomies/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[SUPER_ADMIN] Seed master organizations, categories, and states' })
  async seedMasterTaxonomies() {
    return this.taxonomiesService.seedMasterTaxonomies();
  }
}
