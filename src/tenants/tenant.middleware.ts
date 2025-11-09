import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { TenantContext } from './tenant-context';

/**
 * Middleware to extract and validate tenant from request
 * Supports extraction from:
 * 1. X-Tenant-ID header
 * 2. Subdomain (e.g., acme.example.com)
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly tenantContext: TenantContext,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantSlug = this.extractTenantSlug(req);

    if (!tenantSlug) {
      throw new HttpException('Tenant identifier is required', HttpStatus.BAD_REQUEST);
    }

    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug, isActive: true },
    });

    if (!tenant) {
      throw new HttpException('Tenant not found or inactive', HttpStatus.NOT_FOUND);
    }

    this.tenantContext.setTenantId(tenant.id);
    next();
  }

  /**
   * Extract tenant slug from request
   * Priority: 1) Header, 2) Subdomain
   */
  private extractTenantSlug(req: Request): string | null {
    // Try header first
    const headerTenant = req.headers['x-tenant-id'] as string;
    if (headerTenant) {
      return headerTenant;
    }

    // Try subdomain
    const host = req.headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
        return subdomain;
      }
    }

    return null;
  }
}
