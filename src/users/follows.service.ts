import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './follow.entity';
import { User } from './user.entity';
import { TenantContext } from '../tenants/tenant-context';

/**
 * Follows service with tenant isolation
 * Manages user following relationships within tenant
 */
@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Follow a user (idempotent)
   */
  async follow(username: string, followerId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify user to follow exists in current tenant
    const userToFollow = await this.userRepository.findOne({
      where: { username, tenantId, isActive: true },
    });

    if (!userToFollow) {
      throw new NotFoundException('User not found');
    }

    // Cannot follow yourself
    if (userToFollow.id === followerId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId: userToFollow.id, tenantId },
    });

    if (existingFollow) {
      // Already following - idempotent operation
      return;
    }

    // Create follow relationship
    const follow = this.followRepository.create({
      followerId,
      followingId: userToFollow.id,
      tenantId,
    });

    await this.followRepository.save(follow);
  }

  /**
   * Unfollow a user (idempotent)
   */
  async unfollow(username: string, followerId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify user exists in current tenant
    const userToUnfollow = await this.userRepository.findOne({
      where: { username, tenantId, isActive: true },
    });

    if (!userToUnfollow) {
      throw new NotFoundException('User not found');
    }

    // Check if following
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId: userToUnfollow.id, tenantId },
    });

    if (!follow) {
      // Not following - idempotent operation
      return;
    }

    // Remove follow relationship
    await this.followRepository.delete({ id: follow.id, tenantId });
  }
}
