import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { TenantContext } from '../tenants/tenant-context';

/**
 * Audit module for tracking sensitive operations
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService, TenantContext],
  exports: [AuditService, TypeOrmModule],
})
export class AuditModule {}
