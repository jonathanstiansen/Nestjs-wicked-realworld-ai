import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './profiles.controller';
import { UsersService } from './users.service';
import { FollowsService } from './follows.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let usersService: UsersService;
  let followsService: FollowsService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    bio: 'Test bio',
    image: 'https://example.com/image.jpg',
  };

  const mockCurrentUser = {
    id: 'current-user-1',
    username: 'currentuser',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
          },
        },
        {
          provide: FollowsService,
          useValue: {
            follow: jest.fn(),
            unfollow: jest.fn(),
            isFollowing: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    usersService = module.get<UsersService>(UsersService);
    followsService = module.get<FollowsService>(FollowsService);
  });

  describe('Scenario: Get profile', () => {
    it('Given existing user, when getting profile, then returns profile', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser as any);
      jest.spyOn(followsService, 'isFollowing').mockResolvedValue(false);

      // Act
      const result = await controller.getProfile('testuser', { user: mockCurrentUser } as any);

      // Assert
      expect(usersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(result).toEqual({
        profile: expect.objectContaining({
          username: 'testuser',
          bio: 'Test bio',
          following: false,
        }),
      });
    });

    it('Given following user, when getting profile, then returns profile with following true', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser as any);
      jest.spyOn(followsService, 'isFollowing').mockResolvedValue(true);

      // Act
      const result = await controller.getProfile('testuser', { user: mockCurrentUser } as any);

      // Assert
      expect(followsService.isFollowing).toHaveBeenCalledWith(mockCurrentUser.id, mockUser.id);
      expect(result.profile.following).toBe(true);
    });
  });

  describe('Scenario: Follow user', () => {
    it('Given authenticated user, when following another user, then returns profile with following true', async () => {
      // Arrange
      const mockRequest = { user: mockCurrentUser };
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser as any);
      jest.spyOn(followsService, 'follow').mockResolvedValue(undefined);
      jest.spyOn(followsService, 'isFollowing').mockResolvedValue(true);

      // Act
      const result = await controller.followUser('testuser', mockRequest as any);

      // Assert
      expect(followsService.follow).toHaveBeenCalledWith(mockCurrentUser.id, mockUser.id);
      expect(result.profile.following).toBe(true);
    });
  });

  describe('Scenario: Unfollow user', () => {
    it('Given authenticated user following another, when unfollowing, then returns profile with following false', async () => {
      // Arrange
      const mockRequest = { user: mockCurrentUser };
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(mockUser as any);
      jest.spyOn(followsService, 'unfollow').mockResolvedValue(undefined);
      jest.spyOn(followsService, 'isFollowing').mockResolvedValue(false);

      // Act
      const result = await controller.unfollowUser('testuser', mockRequest as any);

      // Assert
      expect(followsService.unfollow).toHaveBeenCalledWith(mockCurrentUser.id, mockUser.id);
      expect(result.profile.following).toBe(false);
    });
  });
});
