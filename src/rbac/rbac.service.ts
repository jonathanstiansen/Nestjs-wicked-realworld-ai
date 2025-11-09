import { Injectable } from '@nestjs/common';
import { Role, Permission } from './roles.enum';

/**
 * RBAC service to manage role-based access control
 * Implements permission checking and role hierarchy
 */
@Injectable()
export class RbacService {
  private rolePermissions: Map<Role, Permission[]>;
  private roleHierarchy: Map<Role, number>;

  constructor() {
    this.initializeRolePermissions();
    this.initializeRoleHierarchy();
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(roles: Role[], permission: Permission): boolean {
    for (const role of roles) {
      const permissions = this.rolePermissions.get(role) || [];
      if (permissions.includes(permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user can assign a specific role
   */
  canAssignRole(userRoles: Role[], targetRole: Role): boolean {
    // Super admin can assign any role
    if (userRoles.includes(Role.SUPER_ADMIN)) {
      return true;
    }

    // Tenant admin can assign user, moderator, or tenant_admin
    if (userRoles.includes(Role.TENANT_ADMIN)) {
      return [Role.USER, Role.MODERATOR, Role.TENANT_ADMIN].includes(targetRole);
    }

    // Others cannot assign roles
    return false;
  }

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: Role): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * Get role hierarchy level (higher = more privileges)
   */
  getRoleLevel(role: Role): number {
    return this.roleHierarchy.get(role) || 0;
  }

  /**
   * Initialize role permissions mapping
   */
  private initializeRolePermissions(): void {
    this.rolePermissions = new Map<Role, Permission[]>();

    // User permissions (basic)
    this.rolePermissions.set(Role.USER, [
      Permission.CREATE_ARTICLE,
      Permission.READ_ARTICLE,
      Permission.UPDATE_OWN_ARTICLE,
      Permission.DELETE_OWN_ARTICLE,
      Permission.CREATE_COMMENT,
      Permission.READ_COMMENT,
      Permission.DELETE_OWN_COMMENT,
      Permission.READ_USER,
      Permission.UPDATE_OWN_PROFILE,
      Permission.READ_OWN_AUDIT,
    ]);

    // Moderator permissions (inherit user + content moderation)
    this.rolePermissions.set(Role.MODERATOR, [
      ...this.rolePermissions.get(Role.USER)!,
      Permission.DELETE_ANY_COMMENT,
      Permission.DELETE_ANY_ARTICLE,
    ]);

    // Tenant Admin permissions (inherit moderator + user management)
    this.rolePermissions.set(Role.TENANT_ADMIN, [
      ...this.rolePermissions.get(Role.MODERATOR)!,
      Permission.UPDATE_ANY_ARTICLE,
      Permission.UPDATE_ANY_USER,
      Permission.DEACTIVATE_USER,
      Permission.ASSIGN_ROLE_USER,
      Permission.ASSIGN_ROLE_MODERATOR,
      Permission.ASSIGN_ROLE_TENANT_ADMIN,
      Permission.READ_TENANT_AUDIT,
    ]);

    // Super Admin permissions (all permissions)
    this.rolePermissions.set(Role.SUPER_ADMIN, [
      ...this.rolePermissions.get(Role.TENANT_ADMIN)!,
      Permission.ASSIGN_ROLE_SUPER_ADMIN,
      Permission.SWITCH_TENANT,
      Permission.READ_ALL_AUDIT,
      Permission.MANAGE_TENANT,
    ]);
  }

  /**
   * Initialize role hierarchy (higher number = higher privilege)
   */
  private initializeRoleHierarchy(): void {
    this.roleHierarchy = new Map<Role, number>();
    this.roleHierarchy.set(Role.USER, 1);
    this.roleHierarchy.set(Role.MODERATOR, 2);
    this.roleHierarchy.set(Role.TENANT_ADMIN, 3);
    this.roleHierarchy.set(Role.SUPER_ADMIN, 4);
  }
}
