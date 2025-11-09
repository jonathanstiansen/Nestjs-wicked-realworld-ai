import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { TenantContext } from '../tenants/tenant-context';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcrypt = require('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockUser = {
    id: 'user-1',
    tenantId: mockTenantId,
    email: 'test@example.com',
    username: 'testuser',
    bio: 'Test bio',
    image: 'https://example.com/image.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
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

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Find user by ID', () => {
    it('Given existing user, when finding by ID, then returns user', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findById('user-1');

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1', tenantId: mockTenantId },
      });
      expect(result).toEqual(mockUser);
    });

    it('Given non-existent user, when finding by ID, then throws NotFoundException', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('user-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Scenario: Update user', () => {
    it('Given valid update data, when updating user, then returns updated user', async () => {
      // Arrange
      const updateDto: UpdateUserDto = {
        bio: 'Updated bio',
        image: 'https://example.com/new-image.jpg',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        ...updateDto,
      } as any);

      // Act
      const result = await service.update('user-1', updateDto);

      // Assert
      expect(result.bio).toBe('Updated bio');
      expect(result.image).toBe('https://example.com/new-image.jpg');
    });

    it('Given duplicate email, when updating user, then throws ConflictException', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { email: 'duplicate@example.com' };
      const otherUser = { ...mockUser, id: 'user-2', email: 'duplicate@example.com' };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(otherUser as any);

      // Act & Assert
      await expect(service.update('user-1', updateDto)).rejects.toThrow(ConflictException);
    });

    it('Given new password, when updating user, then hashes password', async () => {
      // Arrange
      const updateDto: UpdateUserDto = { password: 'newpassword' };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(null);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as any);

      // Act
      await service.update('user-1', updateDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
    });
  });
});
