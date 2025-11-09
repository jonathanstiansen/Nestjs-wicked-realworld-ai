import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test bio',
    image: 'https://example.com/image.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('Scenario: Get current user', () => {
    it('Given authenticated user, when getting current user, then returns user profile', async () => {
      // Arrange
      const mockRequest = { user: { id: mockUser.id } };
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser as any);

      // Act
      const result = await controller.getCurrentUser(mockRequest as any);

      // Assert
      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        user: expect.objectContaining({
          email: 'test@example.com',
          username: 'testuser',
          bio: 'Test bio',
        }),
      });
    });
  });

  describe('Scenario: Update current user', () => {
    it('Given valid update data, when updating current user, then returns updated user', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        bio: 'Updated bio',
        image: 'https://example.com/new-image.jpg',
      };
      const mockRequest = { user: { id: mockUser.id } };

      jest.spyOn(usersService, 'update').mockResolvedValue({
        ...mockUser,
        bio: 'Updated bio',
        image: 'https://example.com/new-image.jpg',
      } as any);

      // Act
      const result = await controller.updateCurrentUser(updateDto, mockRequest as any);

      // Assert
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(result.user.bio).toBe('Updated bio');
      expect(result.user.image).toBe('https://example.com/new-image.jpg');
    });
  });
});
