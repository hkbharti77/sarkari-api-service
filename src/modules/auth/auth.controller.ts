import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { AuditService } from './audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AdminRole } from './schemas/admin-user.schema';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Authentication & RBAC')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  // ─── PUBLIC: LOGIN ──────────────────────────────────────────────────────────

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login — returns JWT access token' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ─── PUBLIC: SEED SUPER ADMIN (dev-only) ────────────────────────────────────

  @Post('admin/auth/seed-admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[DEV-ONLY] Seed default super admin — admin@govjob.in / Admin@1234',
  })
  @ApiResponse({ status: 201, description: 'Super admin seeded or already exists' })
  async seedSuperAdmin() {
    return this.authService.seedSuperAdmin();
  }

  // ─── PROTECTED: CURRENT USER ─────────────────────────────────────────────────

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currently authenticated admin profile' })
  @ApiResponse({ status: 200, description: 'Returns authenticated user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  // ─── PROTECTED: LOGOUT (client-side token drop, server-side audit) ──────────

  @Post('auth/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — records audit event (token invalidation is client-side)' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.auditService.createAuditLog({
      actor: user.email,
      role: user.role,
      action: 'ADMIN_LOGOUT',
    });
    return { message: 'Logged out successfully. Please discard the token on client.' };
  }

  // ─── PROTECTED: CREATE ADMIN USER (SUPER_ADMIN only) ────────────────────────

  @Post('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[SUPER_ADMIN] Create a new admin user' })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createAdminUser(
    @Body() dto: CreateAdminUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.authService.createAdminUser(dto, user.email, user.role);
  }

  // ─── PROTECTED: LIST ADMIN USERS (SUPER_ADMIN only) ─────────────────────────

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[SUPER_ADMIN] List all admin users' })
  async listAdminUsers() {
    return this.authService.findAllAdminUsers();
  }

  // ─── PROTECTED: TOGGLE USER ACTIVE (SUPER_ADMIN only) ───────────────────────

  @Patch('admin/users/:userId/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[SUPER_ADMIN] Activate or deactivate an admin user' })
  async toggleUserActive(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.authService.toggleUserActive(userId, user.email, user.role);
  }

  // ─── PROTECTED: AUDIT LOGS ───────────────────────────────────────────────────

  @Get('admin/audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.REVIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[SUPER_ADMIN, REVIEWER] Retrieve paginated audit logs' })
  @ApiQuery({ name: 'actor', required: false, description: 'Filter by actor email' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'referenceId', required: false, description: 'Filter by document reference ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  async getAuditLogs(
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('referenceId') referenceId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      actor,
      action,
      referenceId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post('admin/audit-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create manual audit log entry' })
  async createAuditLog(
    @CurrentUser() user: { email: string; role: AdminRole },
    @Body() body: { action: string; referenceId?: string; statusType?: string; metadata?: Record<string, unknown> },
  ) {
    await this.auditService.createAuditLog({
      actor: user.email,
      role: user.role,
      action: body.action,
      referenceId: body.referenceId,
      statusType: body.statusType,
      metadata: body.metadata,
    });
    return { recorded: true };
  }
}
