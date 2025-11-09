import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

/**
 * Authentication controller
 * Handles user registration and login
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);

    return {
      user: {
        email: result.user.email,
        token: result.token,
        username: result.user.username,
        bio: result.user.bio,
        image: result.user.image,
      },
    };
  }

  /**
   * Login user
   */
  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);

    return {
      user: {
        email: result.user.email,
        token: result.token,
        username: result.user.username,
        bio: result.user.bio,
        image: result.user.image,
      },
    };
  }
}
