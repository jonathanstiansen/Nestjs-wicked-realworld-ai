import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/article.entity';
import { TenantContext } from '../tenants/tenant-context';

/**
 * Tags service with tenant isolation
 * Returns unique tags from all articles in the current tenant
 */
@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Get all unique tags from articles in current tenant
   */
  async findAll(): Promise<string[]> {
    const tenantId = this.tenantContext.getTenantId();

    const articles = await this.articleRepository.find({
      where: { tenantId },
      select: ['tagList'],
    });

    // Flatten all tag lists and get unique values
    const allTags = articles.flatMap(article => article.tagList || []);
    const uniqueTags = [...new Set(allTags)];

    return uniqueTags;
  }
}
