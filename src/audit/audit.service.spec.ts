import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResult } from './audit-log.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: Repository<AuditLog>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockActorId = 'user-1';

  const mockAuditLog: AuditLog = {
    id: 'audit-1',
    tenantId: mockTenantId,
    actorId: mockActorId,
    action: AuditAction.ARTICLE_CREATE,
    resourceType: 'article',
    resourceId: 'article-1',
    result: AuditResult.SUCCESS,
    metadata: { title: 'Test Article' },
    ipAddress: '127.0.0.1',
    userAgent: 'Jest Test',
    tenant: null,
    actor: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: TenantContext,
          useValue: {
            getTenantId: jest.fn().mockReturnValue(mockTenantId),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Log sensitive write operations', () => {
    it('Given successful article creation, when logging, then creates audit entry with success result', async () => {
      // Arrange
      const logData = {
        actorId: mockActorId,
        action: AuditAction.ARTICLE_CREATE,
        resourceType: 'article',
        resourceId: 'article-1',
        result: AuditResult.SUCCESS,
        metadata: { title: 'Test Article' },
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      jest.spyOn(auditLogRepository, 'create').mockReturnValue(mockAuditLog);
      jest.spyOn(auditLogRepository, 'save').mockResolvedValue(mockAuditLog);

      // Act
      await service.log(logData);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(auditLogRepository.create).toHaveBeenCalledWith({
        ...logData,
        tenantId: mockTenantId,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('Given cross-tenant access attempt, when logging, then creates denied audit entry', async () => {
      // Arrange
      const logData = {
        actorId: mockActorId,
        action: AuditAction.CROSS_TENANT_ATTEMPT,
        resourceType: 'article',
        resourceId: 'article-from-other-tenant',
        result: AuditResult.DENIED,
        metadata: { attemptedTenantId: 'tenant-2' },
      };

      jest.spyOn(auditLogRepository, 'create').mockReturnValue({
        ...mockAuditLog,
        action: AuditAction.CROSS_TENANT_ATTEMPT,
        result: AuditResult.DENIED,
      } as AuditLog);
      jest.spyOn(auditLogRepository, 'save').mockResolvedValue(mockAuditLog as any);

      // Act
      await service.log(logData);

      // Assert
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('Given user role change, when logging, then includes metadata about old and new roles', async () => {
      // Arrange
      const logData = {
        actorId: mockActorId,
        action: AuditAction.USER_ROLE_CHANGE,
        resourceType: 'user',
        resourceId: 'user-2',
        result: AuditResult.SUCCESS,
        metadata: {
          oldRoles: ['user'],
          newRoles: ['user', 'moderator'],
        },
      };

      jest.spyOn(auditLogRepository, 'create').mockReturnValue(mockAuditLog);
      jest.spyOn(auditLogRepository, 'save').mockResolvedValue(mockAuditLog);

      // Act
      await service.log(logData);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldRoles: ['user'],
            newRoles: ['user', 'moderator'],
          }),
        }),
      );
    });
  });

  describe('Scenario: Query audit logs for tenant', () => {
    it('Given logs exist, when querying for tenant, then returns filtered logs', async () => {
      // Arrange
      const mockLogs = [mockAuditLog, { ...mockAuditLog, id: 'audit-2' }];
      jest.spyOn(auditLogRepository, 'find').mockResolvedValue(mockLogs);

      // Act
      const result = await service.findForTenant({ limit: 10, offset: 0 });

      // Assert
      expect(auditLogRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        relations: ['actor'],
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });
      expect(result).toHaveLength(2);
    });

    it('Given actor filter, when querying, then filters by actor', async () => {
      // Arrange
      jest.spyOn(auditLogRepository, 'find').mockResolvedValue([mockAuditLog]);

      // Act
      await service.findForTenant({ actorId: mockActorId, limit: 10, offset: 0 });

      // Assert
      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actorId: mockActorId,
          }),
        }),
      );
    });

    it('Given action filter, when querying, then filters by action', async () => {
      // Arrange
      jest.spyOn(auditLogRepository, 'find').mockResolvedValue([mockAuditLog]);

      // Act
      await service.findForTenant({
        action: AuditAction.ARTICLE_CREATE,
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: AuditAction.ARTICLE_CREATE,
          }),
        }),
      );
    });
  });

  describe('Scenario: Count audit logs', () => {
    it('Given logs exist, when counting for tenant, then returns count', async () => {
      // Arrange
      jest.spyOn(auditLogRepository, 'count').mockResolvedValue(42);

      // Act
      const result = await service.countForTenant();

      // Assert
      expect(auditLogRepository.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
      expect(result).toBe(42);
    });

    it('Given action filter, when counting, then filters by action', async () => {
      // Arrange
      jest.spyOn(auditLogRepository, 'count').mockResolvedValue(5);

      // Act
      await service.countForTenant({ action: AuditAction.ACCESS_DENIED });

      // Assert
      expect(auditLogRepository.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, action: AuditAction.ACCESS_DENIED },
      });
    });
  });
});
