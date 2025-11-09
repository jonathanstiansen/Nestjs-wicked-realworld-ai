import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt at module level
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockUser: User = {
    id: 'user-1',
    tenantId: mockTenantId,
    email: 'test@example.com',
    username: 'testuser',
    password: '$2b$10$hashedpassword',
    bio: null,
    image: null,
    roles: ['user'],
    isActive: true,
    tenant: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
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

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: User registration within tenant', () => {
    it('Given valid credentials, when user registers, then account is created with tenant isolation', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue({
        ...mockUser,
        ...registerDto,
        tenantId: mockTenantId,
      } as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        ...registerDto,
        tenantId: mockTenantId,
      } as User);
      jest.spyOn(jwtService, 'sign').mockReturnValue('jwt-token');

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [
          { email: registerDto.email, tenantId: mockTenantId },
          { username: registerDto.username, tenantId: mockTenantId },
        ],
      });
      expect(result).toHaveProperty('token', 'jwt-token');
      expect(result.user).toHaveProperty('tenantId', mockTenantId);
    });

    it('Given duplicate email in same tenant, when user registers, then throws conflict error', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Given duplicate username in same tenant, when user registers, then throws conflict error', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        username: 'existinguser',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('Scenario: User login with tenant isolation', () => {
    it('Given valid credentials for user in current tenant, when user logs in, then returns JWT token', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(jwtService, 'sign').mockReturnValue('jwt-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email, tenantId: mockTenantId },
      });
      expect(result).toHaveProperty('token', 'jwt-token');
      expect(result.user).toHaveProperty('email', loginDto.email);
    });

    it('Given invalid credentials, when user logs in, then throws unauthorized error', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Given user from different tenant, when user logs in, then throws unauthorized error', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Given inactive user, when user logs in, then throws unauthorized error', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const inactiveUser = { ...mockUser, isActive: false };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Scenario: Validate JWT token with tenant context', () => {
    it('Given valid JWT payload, when validating user, then returns user from correct tenant', async () => {
      // Arrange
      const payload = { sub: 'user-1', email: 'test@example.com' };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(payload);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub, tenantId: mockTenantId, isActive: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('Given user from different tenant, when validating user, then returns null', async () => {
      // Arrange
      const payload = { sub: 'user-1', email: 'test@example.com' };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateUser(payload);

      // Assert
      expect(result).toBeNull();
    });
  });
});
