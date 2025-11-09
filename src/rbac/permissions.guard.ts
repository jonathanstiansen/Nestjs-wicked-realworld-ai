import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from './roles.enum';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { RbacService } from './rbac.service';

/**
 * Guard to check if user has required permissions
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false; // No user authenticated
    }

    // Check if user has all required permissions
    return requiredPermissions.every((permission) =>
      this.rbacService.hasPermission(user.roles || [], permission),
    );
  }
}
