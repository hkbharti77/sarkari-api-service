import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../schemas/admin-user.schema';

export const ROLES_KEY = 'roles';

/**
 * Restrict an endpoint to specific admin roles.
 * Usage: @Roles(AdminRole.SUPER_ADMIN, AdminRole.PUBLISHER)
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
