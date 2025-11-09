import { SetMetadata } from '@nestjs/common';
import { Role } from './roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to require specific roles for a route
 * Usage: @Roles(Role.ADMIN, Role.MODERATOR)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
