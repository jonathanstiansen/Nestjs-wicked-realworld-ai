import { Test, TestingModule } from '@nestjs/testing';
import { FollowsService } from './follows.service';
import { Repository } from 'typeorm';
import { Follow } from './follow.entity';
import { User } from './user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FollowsService', () => {
  let service: FollowsService;
  let followRepository: Repository<Follow>;
  let userRepository: Repository<User>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockFollowerId = 'user-1';
  const mockFollowingId = 'user-2';

  const mockUser: User = {
    id: mockFollowingId,
    tenantId: mockTenantId,
    email: 'user2@example.com',
    username: 'user2',
    password: 'hashed',
    bio: null,
    image: null,
    roles: ['user'],
    isActive: true,
    tenant: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFollow: Follow = {
    id: 'follow-1',
    tenantId: mockTenantId,
    followerId: mockFollowerId,
    followingId: mockFollowingId,
    tenant: null,
    follower: null,
    following: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
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

    service = module.get<FollowsService>(FollowsService);
    followRepository = module.get<Repository<Follow>>(getRepositoryToken(Follow));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Follow a user', () => {
    it('Given user exists in tenant, when following, then follow relationship is created', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(followRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(followRepository, 'create').mockReturnValue(mockFollow);
      jest.spyOn(followRepository, 'save').mockResolvedValue(mockFollow);

      // Act
      await service.followByUsername('user2', mockFollowerId);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'user2', tenantId: mockTenantId, isActive: true },
      });
      expect(followRepository.save).toHaveBeenCalled();
    });

    it('Given already following user, when following again, then returns idempotent success', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(followRepository, 'findOne').mockResolvedValue(mockFollow);

      // Act
      await service.followByUsername('user2', mockFollowerId);

      // Assert
      expect(followRepository.save).not.toHaveBeenCalled();
    });

    it('Given user tries to follow themselves, when following, then throws bad request', async () => {
      // Arrange
      const selfUser = { ...mockUser, id: mockFollowerId, username: 'user1' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(selfUser);

      // Act & Assert
      await expect(service.followByUsername('user1', mockFollowerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Given user from different tenant, when following, then throws not found', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.followByUsername('user2', mockFollowerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Scenario: Unfollow a user', () => {
    it('Given following a user, when unfollowing, then follow relationship is removed', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(followRepository, 'findOne').mockResolvedValue(mockFollow);
      jest.spyOn(followRepository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.unfollowByUsername('user2', mockFollowerId);

      // Assert
      expect(followRepository.delete).toHaveBeenCalledWith({
        id: mockFollow.id,
        tenantId: mockTenantId,
      });
    });

    it('Given not following user, when unfollowing, then returns idempotent success', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(followRepository, 'findOne').mockResolvedValue(null);

      // Act
      await service.unfollowByUsername('user2', mockFollowerId);

      // Assert
      expect(followRepository.delete).not.toHaveBeenCalled();
    });

    it('Given user from different tenant, when unfollowing, then throws not found', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.unfollowByUsername('user2', mockFollowerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
