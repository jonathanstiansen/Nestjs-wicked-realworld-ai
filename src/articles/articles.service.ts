import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity';
import { TenantContext } from '../tenants/tenant-context';

export interface CreateArticleDto {
  title: string;
  description: string;
  body: string;
  tagList?: string[];
}

export interface UpdateArticleDto {
  title?: string;
  description?: string;
  body?: string;
  tagList?: string[];
}

export interface FindArticlesQuery {
  tag?: string;
  author?: string;
  favorited?: string;
  limit?: number;
  offset?: number;
}

/**
 * Articles service with tenant isolation
 * All operations are scoped to the current tenant
 */
@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Create a new article within the current tenant
   * Generates unique slug from title
   */
  async create(dto: CreateArticleDto, authorId: string): Promise<Article> {
    const tenantId = this.tenantContext.getTenantId();
    const slug = await this.generateUniqueSlug(dto.title, tenantId);

    const article = this.articleRepository.create({
      ...dto,
      slug,
      tenantId,
      authorId,
      tagList: dto.tagList || [],
    });

    return this.articleRepository.save(article);
  }

  /**
   * Find all articles in current tenant with optional filters
   */
  async findAll(query: FindArticlesQuery): Promise<Article[]> {
    const tenantId = this.tenantContext.getTenantId();
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    return this.articleRepository.find({
      where: { tenantId },
      relations: ['author'],
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find article by slug within current tenant
   */
  async findBySlug(slug: string): Promise<Article> {
    const tenantId = this.tenantContext.getTenantId();

    const article = await this.articleRepository.findOne({
      where: { slug, tenantId },
      relations: ['author'],
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }

  /**
   * Update article (only by author)
   */
  async update(
    slug: string,
    dto: UpdateArticleDto,
    userId: string,
  ): Promise<Article> {
    const article = await this.findBySlug(slug);

    // Only author can update
    if (article.authorId !== userId) {
      throw new ForbiddenException('Only the author can update this article');
    }

    // Update fields
    Object.assign(article, dto);

    // If title changed, regenerate slug
    if (dto.title && dto.title !== article.title) {
      article.slug = await this.generateUniqueSlug(dto.title, article.tenantId);
    }

    return this.articleRepository.save(article);
  }

  /**
   * Delete article (only by author)
   */
  async delete(slug: string, userId: string): Promise<void> {
    const article = await this.findBySlug(slug);

    // Only author can delete
    if (article.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this article');
    }

    const tenantId = this.tenantContext.getTenantId();
    await this.articleRepository.delete({ id: article.id, tenantId });
  }

  /**
   * Generate unique slug from title within tenant
   * If slug exists, appends number suffix
   */
  private async generateUniqueSlug(title: string, tenantId: string): Promise<string> {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let suffix = 0;

    // Check for slug collision within tenant
    while (await this.slugExists(slug, tenantId)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }

  /**
   * Convert title to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Check if slug exists in tenant
   */
  private async slugExists(slug: string, tenantId: string): Promise<boolean> {
    const article = await this.articleRepository.findOne({
      where: { slug, tenantId },
    });
    return !!article;
  }
}
