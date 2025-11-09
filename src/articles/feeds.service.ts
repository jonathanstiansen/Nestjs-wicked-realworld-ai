import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity';
import { Follow } from '../users/follow.entity';
import { TenantContext } from '../tenants/tenant-context';

export interface FeedQuery {
  limit?: number;
  offset?: number;
}

/**
 * Feeds service with tenant isolation
 * Provides personal feed (followed users) and global feed (all articles)
 */
@Injectable()
export class FeedsService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Get personal feed - articles from users the current user follows
   */
  async getPersonalFeed(userId: string, query: FeedQuery): Promise<Article[]> {
    const tenantId = this.tenantContext.getTenantId();
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    // Get users that current user follows
    const follows = await this.followRepository.find({
      where: { followerId: userId, tenantId },
      select: ['followingId'],
    });

    // If not following anyone, return empty feed
    if (follows.length === 0) {
      return [];
    }

    const followingIds = follows.map((f) => f.followingId);

    // Get articles from followed users
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .where('article.tenantId = :tenantId', { tenantId })
      .andWhere('article.authorId IN (:...authorIds)', { authorIds: followingIds })
      .orderBy('article.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
  }

  /**
   * Get global feed - all articles in the tenant
   */
  async getGlobalFeed(query: FeedQuery): Promise<Article[]> {
    const tenantId = this.tenantContext.getTenantId();
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    return this.articleRepository.find({
      where: { tenantId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
