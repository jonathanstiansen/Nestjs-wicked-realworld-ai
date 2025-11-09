import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { Article } from '../articles/article.entity';
import { TenantContext } from '../tenants/tenant-context';

export interface CreateCommentDto {
  body: string;
}

/**
 * Comments service with tenant isolation
 * Comments are scoped to articles within the current tenant
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Create a comment on an article
   */
  async create(
    articleSlug: string,
    dto: CreateCommentDto,
    authorId: string,
  ): Promise<Comment> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify article exists in current tenant
    const article = await this.articleRepository.findOne({
      where: { slug: articleSlug, tenantId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const comment = this.commentRepository.create({
      ...dto,
      articleId: article.id,
      authorId,
      tenantId,
    });

    return this.commentRepository.save(comment);
  }

  /**
   * Get all comments for an article
   */
  async findByArticleSlug(articleSlug: string): Promise<Comment[]> {
    const tenantId = this.tenantContext.getTenantId();

    // Verify article exists in current tenant
    const article = await this.articleRepository.findOne({
      where: { slug: articleSlug, tenantId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.commentRepository.find({
      where: { articleId: article.id, tenantId },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete a comment (only by author)
   */
  async delete(
    articleSlug: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, tenantId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author can delete
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this comment');
    }

    await this.commentRepository.delete({ id: commentId, tenantId });
  }
}
