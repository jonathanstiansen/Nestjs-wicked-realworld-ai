import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { TenantContext } from '../tenants/tenant-context';
import * as bcrypt from 'bcrypt';

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Partial<User>;
}

/**
 * Authentication service with tenant isolation
 * All operations are scoped to the current tenant from TenantContext
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Register a new user within the current tenant
   * Ensures email and username are unique within the tenant
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const tenantId = this.tenantContext.getTenantId();

    // Check if user already exists in this tenant
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: dto.email, tenantId },
        { username: dto.username, tenantId },
      ],
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists in this tenant');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
      tenantId,
      roles: ['user'],
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate JWT
    const token = this.generateToken(savedUser);

    return {
      token,
      user: this.sanitizeUser(savedUser),
    };
  }

  /**
   * Login user within the current tenant
   * Validates credentials and tenant membership
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const tenantId = this.tenantContext.getTenantId();

    // Find user in current tenant
    const user = await this.userRepository.findOne({
      where: { email: dto.email, tenantId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const token = this.generateToken(user);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Validate user from JWT payload
   * Ensures user belongs to current tenant
   */
  async validateUser(payload: any): Promise<User | null> {
    const tenantId = this.tenantContext.getTenantId();

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, tenantId, isActive: true },
    });

    return user;
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId };
    return this.jwtService.sign(payload);
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): Partial<User> {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
