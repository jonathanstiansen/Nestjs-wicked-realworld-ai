import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { TenantContext } from '../tenants/tenant-context';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

/**
 * Service for managing user profiles
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Find user by ID within current tenant
   */
  async findById(userId: string): Promise<User> {
    const tenantId = this.tenantContext.getTenantId();

    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find user by username within current tenant
   */
  async findByUsername(username: string): Promise<User> {
    const tenantId = this.tenantContext.getTenantId();

    const user = await this.userRepository.findOne({
      where: { username, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const tenantId = this.tenantContext.getTenantId();

    const user = await this.findById(userId);

    // Check for email/username uniqueness if being updated
    if (dto.email || dto.username) {
      const existingUser = await this.userRepository.findOne({
        where: [
          { email: dto.email, tenantId },
          { username: dto.username, tenantId },
        ],
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email or username already exists');
      }
    }

    // Hash password if being updated
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }
}
