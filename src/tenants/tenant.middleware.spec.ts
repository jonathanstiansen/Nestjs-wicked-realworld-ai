import { Test, TestingModule } from '@nestjs/testing';
import { TenantMiddleware } from './tenant.middleware';
import { TenantContext } from './tenant-context';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let tenantContext: TenantContext;
  let tenantRepository: Repository<Tenant>;

  const mockTenant: Tenant = {
    id: 'tenant-1',
    slug: 'acme',
    name: 'Acme Corp',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMiddleware,
        TenantContext,
        {
          provide: getRepositoryToken(Tenant),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    tenantContext = module.get<TenantContext>(TenantContext);
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
  });

  describe('Scenario: Extract tenant from X-Tenant-ID header', () => {
    it('Given a valid tenant header, when middleware processes request, then tenant context is set', async () => {
      // Arrange
      const mockRequest = {
        headers: { 'x-tenant-id': 'acme' },
      } as any;
      const mockResponse = {} as any;
      const mockNext = jest.fn();

      jest.spyOn(tenantRepository, 'findOne').mockResolvedValue(mockTenant);
      const setTenantSpy = jest.spyOn(tenantContext, 'setTenantId');

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'acme', isActive: true },
      });
      expect(setTenantSpy).toHaveBeenCalledWith('tenant-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given missing tenant header, when middleware processes request, then throws 400 error', async () => {
      // Arrange
      const mockRequest = {
        headers: {},
      } as any;
      const mockResponse = {} as any;
      const mockNext = jest.fn();

      // Act & Assert
      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(
        new HttpException('Tenant identifier is required', HttpStatus.BAD_REQUEST),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('Given invalid tenant slug, when middleware processes request, then throws 404 error', async () => {
      // Arrange
      const mockRequest = {
        headers: { 'x-tenant-id': 'nonexistent' },
      } as any;
      const mockResponse = {} as any;
      const mockNext = jest.fn();

      jest.spyOn(tenantRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(
        new HttpException('Tenant not found or inactive', HttpStatus.NOT_FOUND),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Extract tenant from subdomain', () => {
    it('Given a subdomain in hostname, when middleware processes request, then tenant context is set', async () => {
      // Arrange
      const mockRequest = {
        headers: { host: 'acme.example.com' },
      } as any;
      const mockResponse = {} as any;
      const mockNext = jest.fn();

      jest.spyOn(tenantRepository, 'findOne').mockResolvedValue(mockTenant);
      const setTenantSpy = jest.spyOn(tenantContext, 'setTenantId');

      // Act
      await middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'acme', isActive: true },
      });
      expect(setTenantSpy).toHaveBeenCalledWith('tenant-1');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
