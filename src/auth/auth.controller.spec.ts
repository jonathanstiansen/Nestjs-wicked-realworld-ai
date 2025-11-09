import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    tenantId: 'tenant-1',
    bio: null,
    image: null,
    roles: ['user'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse = {
    token: 'jwt-token-123',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Scenario: User registration', () => {
    it('Given valid registration data, when registering, then returns user with token', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
      };

      jest.spyOn(authService, 'register').mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        user: expect.objectContaining({
          email: mockUser.email,
          username: mockUser.username,
          token: 'jwt-token-123',
        }),
      });
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('Scenario: User login', () => {
    it('Given valid credentials, when logging in, then returns user with token', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(authService, 'login').mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual({
        user: expect.objectContaining({
          email: mockUser.email,
          username: mockUser.username,
          token: 'jwt-token-123',
        }),
      });
    });
  });
});
