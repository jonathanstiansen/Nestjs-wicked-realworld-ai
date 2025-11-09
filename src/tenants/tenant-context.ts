import { Injectable } from '@nestjs/common';

/**
 * Tenant context to store current tenant information per request
 * Note: In production, this would use AsyncLocalStorage for true request isolation
 * For simplicity and testability, using a simple injectable class
 */
@Injectable()
export class TenantContext {
  private tenantId: string;

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  getTenantId(): string {
    return this.tenantId;
  }
}
