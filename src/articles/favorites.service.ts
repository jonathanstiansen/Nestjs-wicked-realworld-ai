import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { Article } from './article.entity';
import { TenantContext } from '../tenants/tenant-context';

/**
 * Favorites service with tenant isolation
 * Manages favoriting/unfavoriting articles
 */
@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Favorite an article (idempotent)
   */
  async favorite(articleSlug: string, userId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify article exists in current tenant
    const article = await this.articleRepository.findOne({
      where: { slug: articleSlug, tenantId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Check if already favorited
    const existingFavorite = await this.favoriteRepository.findOne({
      where: { userId, articleId: article.id, tenantId },
    });

    if (existingFavorite) {
      // Already favorited - idempotent operation
      return;
    }

    // Create favorite
    const favorite = this.favoriteRepository.create({
      userId,
      articleId: article.id,
      tenantId,
    });

    await this.favoriteRepository.save(favorite);

    // Increment favorites count
    await this.articleRepository.increment(
      { id: article.id },
      'favoritesCount',
      1,
    );
  }

  /**
   * Unfavorite an article (idempotent)
   */
  async unfavorite(articleSlug: string, userId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify article exists in current tenant
    const article = await this.articleRepository.findOne({
      where: { slug: articleSlug, tenantId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Check if favorited
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, articleId: article.id, tenantId },
    });

    if (!favorite) {
      // Not favorited - idempotent operation
      return;
    }

    // Remove favorite
    await this.favoriteRepository.delete({ id: favorite.id, tenantId });

    // Decrement favorites count
    await this.articleRepository.decrement(
      { id: article.id },
      'favoritesCount',
      1,
    );
  }
}
