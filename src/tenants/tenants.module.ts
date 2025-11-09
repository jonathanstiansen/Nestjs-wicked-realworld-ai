import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantContext } from './tenant-context';

/**
 * Tenants module for multi-tenancy support
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantContext],
  exports: [TenantContext, TypeOrmModule],
})
export class TenantsModule {}
