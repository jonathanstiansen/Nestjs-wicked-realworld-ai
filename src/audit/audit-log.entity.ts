import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

/**
 * Action types for audit logging
 */
export enum AuditAction {
  // User actions
  USER_REGISTER = 'user.register',
  USER_LOGIN = 'user.login',
  USER_UPDATE = 'user.update',
  USER_DEACTIVATE = 'user.deactivate',
  USER_ROLE_CHANGE = 'user.role_change',

  // Article actions
  ARTICLE_CREATE = 'article.create',
  ARTICLE_UPDATE = 'article.update',
  ARTICLE_DELETE = 'article.delete',

  // Comment actions
  COMMENT_CREATE = 'comment.create',
  COMMENT_DELETE = 'comment.delete',

  // Social actions
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',
  FAVORITE = 'favorite',
  UNFAVORITE = 'unfavorite',

  // Access attempts
  ACCESS_DENIED = 'access.denied',
  CROSS_TENANT_ATTEMPT = 'cross_tenant.attempt',
}

/**
 * Result of the audited action
 */
export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
}

/**
 * Audit log entity for tracking sensitive operations
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  actorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @Column({
    type: 'varchar',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({
    type: 'varchar',
    enum: AuditResult,
  })
  result: AuditResult;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
