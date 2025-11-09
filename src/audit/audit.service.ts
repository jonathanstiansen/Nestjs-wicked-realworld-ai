import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResult } from './audit-log.entity';
import { TenantContext } from '../tenants/tenant-context';

export interface CreateAuditLogDto {
  actorId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  result: AuditResult;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  actorId?: string;
  action?: AuditAction;
  resourceType?: string;
  result?: AuditResult;
  limit?: number;
  offset?: number;
}

/**
 * Audit service for tracking sensitive operations
 * All logs are scoped to the current tenant
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Create an audit log entry
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const tenantId = this.tenantContext.getTenantId();

    const auditLog = this.auditLogRepository.create({
      ...dto,
      tenantId,
    });

    return this.auditLogRepository.save(auditLog);
  }

  /**
   * Find audit logs for current tenant
   */
  async findForTenant(query: AuditLogQuery): Promise<AuditLog[]> {
    const tenantId = this.tenantContext.getTenantId();
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const where: any = { tenantId };

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query.result) {
      where.result = query.result;
    }

    return this.auditLogRepository.find({
      where,
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Count audit logs for current tenant
   */
  async countForTenant(query?: Partial<AuditLogQuery>): Promise<number> {
    const tenantId = this.tenantContext.getTenantId();

    const where: any = { tenantId };

    if (query?.actorId) {
      where.actorId = query.actorId;
    }

    if (query?.action) {
      where.action = query.action;
    }

    if (query?.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query?.result) {
      where.result = query.result;
    }

    return this.auditLogRepository.count({ where });
  }
}
