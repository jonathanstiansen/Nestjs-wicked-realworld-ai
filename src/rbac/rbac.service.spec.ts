import { Test, TestingModule } from '@nestjs/testing';
import { RbacService } from './rbac.service';
import { Role, Permission } from './roles.enum';

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RbacService],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  describe('Scenario: Check permissions for different roles', () => {
    it('Given user role, when checking article permissions, then has basic permissions only', () => {
      // Arrange
      const userRoles = [Role.USER];

      // Act & Assert
      expect(service.hasPermission(userRoles, Permission.CREATE_ARTICLE)).toBe(true);
      expect(service.hasPermission(userRoles, Permission.READ_ARTICLE)).toBe(true);
      expect(service.hasPermission(userRoles, Permission.UPDATE_OWN_ARTICLE)).toBe(true);
      expect(service.hasPermission(userRoles, Permission.DELETE_OWN_ARTICLE)).toBe(true);
      expect(service.hasPermission(userRoles, Permission.UPDATE_ANY_ARTICLE)).toBe(false);
      expect(service.hasPermission(userRoles, Permission.DELETE_ANY_ARTICLE)).toBe(false);
    });

    it('Given moderator role, when checking permissions, then can delete any comments and articles', () => {
      // Arrange
      const moderatorRoles = [Role.MODERATOR];

      // Act & Assert
      expect(service.hasPermission(moderatorRoles, Permission.DELETE_ANY_COMMENT)).toBe(true);
      expect(service.hasPermission(moderatorRoles, Permission.DELETE_ANY_ARTICLE)).toBe(true);
      expect(service.hasPermission(moderatorRoles, Permission.DEACTIVATE_USER)).toBe(false);
      expect(service.hasPermission(moderatorRoles, Permission.ASSIGN_ROLE_USER)).toBe(false);
    });

    it('Given tenant admin role, when checking permissions, then can manage users and assign roles within tenant', () => {
      // Arrange
      const tenantAdminRoles = [Role.TENANT_ADMIN];

      // Act & Assert
      expect(service.hasPermission(tenantAdminRoles, Permission.UPDATE_ANY_USER)).toBe(true);
      expect(service.hasPermission(tenantAdminRoles, Permission.DEACTIVATE_USER)).toBe(true);
      expect(service.hasPermission(tenantAdminRoles, Permission.ASSIGN_ROLE_USER)).toBe(true);
      expect(service.hasPermission(tenantAdminRoles, Permission.ASSIGN_ROLE_MODERATOR)).toBe(true);
      expect(service.hasPermission(tenantAdminRoles, Permission.ASSIGN_ROLE_TENANT_ADMIN)).toBe(true);
      expect(service.hasPermission(tenantAdminRoles, Permission.ASSIGN_ROLE_SUPER_ADMIN)).toBe(false);
      expect(service.hasPermission(tenantAdminRoles, Permission.READ_TENANT_AUDIT)).toBe(true);
      expect(service.hasPermission(tenantAdminRoles, Permission.SWITCH_TENANT)).toBe(false);
    });

    it('Given super admin role, when checking permissions, then has all permissions', () => {
      // Arrange
      const superAdminRoles = [Role.SUPER_ADMIN];

      // Act & Assert
      expect(service.hasPermission(superAdminRoles, Permission.ASSIGN_ROLE_SUPER_ADMIN)).toBe(true);
      expect(service.hasPermission(superAdminRoles, Permission.SWITCH_TENANT)).toBe(true);
      expect(service.hasPermission(superAdminRoles, Permission.READ_ALL_AUDIT)).toBe(true);
      expect(service.hasPermission(superAdminRoles, Permission.MANAGE_TENANT)).toBe(true);
    });

    it('Given multiple roles, when checking permissions, then has combined permissions', () => {
      // Arrange
      const multipleRoles = [Role.USER, Role.MODERATOR];

      // Act & Assert
      expect(service.hasPermission(multipleRoles, Permission.CREATE_ARTICLE)).toBe(true);
      expect(service.hasPermission(multipleRoles, Permission.DELETE_ANY_COMMENT)).toBe(true);
      expect(service.hasPermission(multipleRoles, Permission.DEACTIVATE_USER)).toBe(false);
    });
  });

  describe('Scenario: Validate role hierarchy', () => {
    it('Given user tries to assign higher role, when validating, then denies permission', () => {
      // Arrange & Act & Assert
      expect(service.canAssignRole([Role.USER], Role.MODERATOR)).toBe(false);
      expect(service.canAssignRole([Role.MODERATOR], Role.TENANT_ADMIN)).toBe(false);
      expect(service.canAssignRole([Role.TENANT_ADMIN], Role.SUPER_ADMIN)).toBe(false);
    });

    it('Given tenant admin tries to assign within scope, when validating, then allows permission', () => {
      // Arrange & Act & Assert
      expect(service.canAssignRole([Role.TENANT_ADMIN], Role.USER)).toBe(true);
      expect(service.canAssignRole([Role.TENANT_ADMIN], Role.MODERATOR)).toBe(true);
      expect(service.canAssignRole([Role.TENANT_ADMIN], Role.TENANT_ADMIN)).toBe(true);
    });

    it('Given super admin, when validating any role assignment, then allows all', () => {
      // Arrange & Act & Assert
      expect(service.canAssignRole([Role.SUPER_ADMIN], Role.USER)).toBe(true);
      expect(service.canAssignRole([Role.SUPER_ADMIN], Role.MODERATOR)).toBe(true);
      expect(service.canAssignRole([Role.SUPER_ADMIN], Role.TENANT_ADMIN)).toBe(true);
      expect(service.canAssignRole([Role.SUPER_ADMIN], Role.SUPER_ADMIN)).toBe(true);
    });
  });

  describe('Scenario: Get all permissions for role', () => {
    it('Given user role, when getting all permissions, then returns user permission set', () => {
      // Arrange & Act
      const permissions = service.getPermissionsForRole(Role.USER);

      // Assert
      expect(permissions).toContain(Permission.CREATE_ARTICLE);
      expect(permissions).toContain(Permission.UPDATE_OWN_ARTICLE);
      expect(permissions).not.toContain(Permission.UPDATE_ANY_ARTICLE);
    });

    it('Given super admin role, when getting all permissions, then returns all permissions', () => {
      // Arrange & Act
      const permissions = service.getPermissionsForRole(Role.SUPER_ADMIN);

      // Assert
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain(Permission.ASSIGN_ROLE_SUPER_ADMIN);
      expect(permissions).toContain(Permission.SWITCH_TENANT);
    });
  });
});
