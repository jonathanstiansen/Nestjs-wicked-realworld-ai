import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { Article } from '../articles/article.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepository: Repository<Comment>;
  let articleRepository: Repository<Article>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockAuthorId = 'user-1';
  const mockArticleId = 'article-1';

  const mockArticle: Article = {
    id: mockArticleId,
    tenantId: mockTenantId,
    authorId: mockAuthorId,
    slug: 'test-article',
    title: 'Test Article',
    description: 'Test description',
    body: 'Test body',
    tagList: [],
    favoritesCount: 0,
    tenant: null,
    author: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComment: Comment = {
    id: 'comment-1',
    tenantId: mockTenantId,
    authorId: mockAuthorId,
    articleId: mockArticleId,
    body: 'Great article!',
    tenant: null,
    author: null,
    article: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Article),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: TenantContext,
          useValue: {
            getTenantId: jest.fn().mockReturnValue(mockTenantId),
          },
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentRepository = module.get<Repository<Comment>>(getRepositoryToken(Comment));
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Add comment to article', () => {
    it('Given article exists in tenant, when adding comment, then comment is saved with tenant isolation', async () => {
      // Arrange
      const createDto = { body: 'This is a great article!' };

      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(commentRepository, 'create').mockReturnValue({
        ...mockComment,
        ...createDto,
      } as Comment);
      jest.spyOn(commentRepository, 'save').mockResolvedValue({
        ...mockComment,
        ...createDto,
      } as Comment);

      // Act
      const result = await service.create('test-article', createDto, mockAuthorId);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(articleRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-article', tenantId: mockTenantId },
      });
      expect(result.body).toBe(createDto.body);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.articleId).toBe(mockArticleId);
    });

    it('Given article from different tenant, when adding comment, then throws not found', async () => {
      // Arrange
      const createDto = { body: 'Comment' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create('test-article', createDto, mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Scenario: Get comments for article', () => {
    it('Given comments exist, when fetching for article in tenant, then returns comments', async () => {
      // Arrange
      const mockComments = [mockComment, { ...mockComment, id: 'comment-2' }];

      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(commentRepository, 'find').mockResolvedValue(mockComments);

      // Act
      const result = await service.findByArticleSlug('test-article');

      // Assert
      expect(articleRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-article', tenantId: mockTenantId },
      });
      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { articleId: mockArticleId, tenantId: mockTenantId },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('Given article from different tenant, when fetching comments, then throws not found', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByArticleSlug('test-article')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Scenario: Delete comment with authorization', () => {
    it('Given user is author, when deleting comment, then comment is deleted', async () => {
      // Arrange
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(mockComment);
      jest.spyOn(commentRepository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.delete('test-article', 'comment-1', mockAuthorId);

      // Assert
      expect(commentRepository.delete).toHaveBeenCalledWith({
        id: 'comment-1',
        tenantId: mockTenantId,
      });
    });

    it('Given user is not author, when deleting comment, then throws forbidden error', async () => {
      // Arrange
      const differentUserId = 'user-2';
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(mockComment);

      // Act & Assert
      await expect(
        service.delete('test-article', 'comment-1', differentUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Given comment from different tenant, when deleting, then throws not found', async () => {
      // Arrange
      jest.spyOn(commentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.delete('test-article', 'comment-1', mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
