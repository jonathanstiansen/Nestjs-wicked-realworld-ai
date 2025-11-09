import { SetMetadata } from '@nestjs/common';
import { Permission } from './roles.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route
 * Usage: @RequirePermissions(Permission.DELETE_ANY_ARTICLE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
