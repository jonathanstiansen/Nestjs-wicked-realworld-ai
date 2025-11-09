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
   * Follow a user by user IDs (idempotent)
   */
  async follow(followerId: string, followingId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Cannot follow yourself
    if (followingId === followerId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId, tenantId },
    });

    if (existingFollow) {
      // Already following - idempotent operation
      return;
    }

    // Create follow relationship
    const follow = this.followRepository.create({
      followerId,
      followingId,
      tenantId,
    });

    await this.followRepository.save(follow);
  }

  /**
   * Follow a user by username (idempotent)
   */
  async followByUsername(username: string, followerId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify user to follow exists in current tenant
    const userToFollow = await this.userRepository.findOne({
      where: { username, tenantId, isActive: true },
    });

    if (!userToFollow) {
      throw new NotFoundException('User not found');
    }

    await this.follow(followerId, userToFollow.id);
  }

  /**
   * Unfollow a user by user IDs (idempotent)
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Check if following
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId, tenantId },
    });

    if (!follow) {
      // Not following - idempotent operation
      return;
    }

    // Remove follow relationship
    await this.followRepository.delete({ id: follow.id, tenantId });
  }

  /**
   * Unfollow a user by username (idempotent)
   */
  async unfollowByUsername(username: string, followerId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify user exists in current tenant
    const userToUnfollow = await this.userRepository.findOne({
      where: { username, tenantId, isActive: true },
    });

    if (!userToUnfollow) {
      throw new NotFoundException('User not found');
    }

    await this.unfollow(followerId, userToUnfollow.id);
  }

  /**
   * Check if a user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const tenantId = this.tenantContext.getTenantId();

    const follow = await this.followRepository.findOne({
      where: { followerId, followingId, tenantId },
    });

    return !!follow;
  }
}
