/**
 * User roles in the system
 * Hierarchy: Super Admin > Tenant Admin > Moderator > User
 */
export enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  TENANT_ADMIN = 'tenant_admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * Permissions for different actions
 */
export enum Permission {
  // Article permissions
  CREATE_ARTICLE = 'create:article',
  READ_ARTICLE = 'read:article',
  UPDATE_OWN_ARTICLE = 'update:own:article',
  UPDATE_ANY_ARTICLE = 'update:any:article',
  DELETE_OWN_ARTICLE = 'delete:own:article',
  DELETE_ANY_ARTICLE = 'delete:any:article',

  // Comment permissions
  CREATE_COMMENT = 'create:comment',
  READ_COMMENT = 'read:comment',
  DELETE_OWN_COMMENT = 'delete:own:comment',
  DELETE_ANY_COMMENT = 'delete:any:comment',

  // User permissions
  READ_USER = 'read:user',
  UPDATE_OWN_PROFILE = 'update:own:profile',
  UPDATE_ANY_USER = 'update:any:user',
  DEACTIVATE_USER = 'deactivate:user',
  ASSIGN_ROLE_USER = 'assign:role:user',
  ASSIGN_ROLE_MODERATOR = 'assign:role:moderator',
  ASSIGN_ROLE_TENANT_ADMIN = 'assign:role:tenant_admin',
  ASSIGN_ROLE_SUPER_ADMIN = 'assign:role:super_admin',

  // Audit permissions
  READ_OWN_AUDIT = 'read:own:audit',
  READ_TENANT_AUDIT = 'read:tenant:audit',
  READ_ALL_AUDIT = 'read:all:audit',

  // Tenant permissions
  SWITCH_TENANT = 'switch:tenant',
  MANAGE_TENANT = 'manage:tenant',
}
