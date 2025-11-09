import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from './articles.service';
import { Repository } from 'typeorm';
import { Article } from './article.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let articleRepository: Repository<Article>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockAuthorId = 'user-1';
  const mockArticle: Article = {
    id: 'article-1',
    tenantId: mockTenantId,
    authorId: mockAuthorId,
    slug: 'test-article',
    title: 'Test Article',
    description: 'Test description',
    body: 'Test body content',
    tagList: ['test', 'article'],
    favoritesCount: 0,
    tenant: null,
    author: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
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

    service = module.get<ArticlesService>(ArticlesService);
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Create article within tenant', () => {
    it('Given valid article data, when user creates article, then article is saved with tenant isolation and unique slug', async () => {
      // Arrange
      const createDto = {
        title: 'How to Train Your Dragon',
        description: 'Ever wonder how?',
        body: 'It takes a Jacobian',
        tagList: ['dragons', 'training'],
      };

      const expectedSlug = 'how-to-train-your-dragon';

      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null); // No slug collision
      jest.spyOn(articleRepository, 'create').mockReturnValue({
        ...mockArticle,
        ...createDto,
        slug: expectedSlug,
        tenantId: mockTenantId,
        authorId: mockAuthorId,
      } as Article);
      jest.spyOn(articleRepository, 'save').mockResolvedValue({
        ...mockArticle,
        ...createDto,
        slug: expectedSlug,
      } as Article);

      // Act
      const result = await service.create(createDto, mockAuthorId);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(result.slug).toBe(expectedSlug);
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.authorId).toBe(mockAuthorId);
      expect(result.tagList).toEqual(['dragons', 'training']);
    });

    it('Given duplicate slug in same tenant, when creating article, then generates unique slug with suffix', async () => {
      // Arrange
      const createDto = {
        title: 'Test Article',
        description: 'Description',
        body: 'Body',
        tagList: [],
      };

      const existingArticle = { ...mockArticle, slug: 'test-article' };

      // First call returns existing, second returns null (unique)
      jest.spyOn(articleRepository, 'findOne')
        .mockResolvedValueOnce(existingArticle)
        .mockResolvedValueOnce(null);

      jest.spyOn(articleRepository, 'create').mockReturnValue({
        ...mockArticle,
        slug: 'test-article-1',
      } as Article);

      jest.spyOn(articleRepository, 'save').mockResolvedValue({
        ...mockArticle,
        slug: 'test-article-1',
      } as Article);

      // Act
      const result = await service.create(createDto, mockAuthorId);

      // Assert
      expect(result.slug).toContain('test-article');
    });
  });

  describe('Scenario: Find articles within tenant', () => {
    it('Given articles exist, when finding all in tenant, then returns only tenant articles', async () => {
      // Arrange
      const mockArticles = [mockArticle, { ...mockArticle, id: 'article-2' }];
      jest.spyOn(articleRepository, 'find').mockResolvedValue(mockArticles);

      // Act
      const result = await service.findAll({ limit: 20, offset: 0 });

      // Assert
      expect(articleRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        relations: ['author'],
        take: 20,
        skip: 0,
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('Given article exists, when finding by slug in current tenant, then returns article', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);

      // Act
      const result = await service.findBySlug('test-article');

      // Assert
      expect(articleRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-article', tenantId: mockTenantId },
        relations: ['author'],
      });
      expect(result).toEqual(mockArticle);
    });

    it('Given article from different tenant, when finding by slug, then throws not found', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findBySlug('test-article')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Scenario: Update article with authorization', () => {
    it('Given user is author, when updating article, then article is updated', async () => {
      // Arrange
      const updateDto = {
        title: 'Updated Title',
        description: 'Updated description',
        body: 'Updated body',
      };

      const updatedArticle = { ...mockArticle, ...updateDto };

      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(articleRepository, 'save').mockResolvedValue(updatedArticle);

      // Act
      const result = await service.update('test-article', updateDto, mockAuthorId);

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated description');
    });

    it('Given user is not author, when updating article, then throws forbidden error', async () => {
      // Arrange
      const updateDto = { title: 'Hacked Title' };
      const differentUserId = 'user-2';

      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);

      // Act & Assert
      await expect(
        service.update('test-article', updateDto, differentUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Given article from different tenant, when updating, then throws not found', async () => {
      // Arrange
      const updateDto = { title: 'New Title' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('test-article', updateDto, mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Scenario: Delete article with authorization', () => {
    it('Given user is author, when deleting article, then article is deleted', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(articleRepository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await service.delete('test-article', mockAuthorId);

      // Assert
      expect(articleRepository.delete).toHaveBeenCalledWith({
        id: mockArticle.id,
        tenantId: mockTenantId,
      });
    });

    it('Given user is not author, when deleting article, then throws forbidden error', async () => {
      // Arrange
      const differentUserId = 'user-2';
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);

      // Act & Assert
      await expect(
        service.delete('test-article', differentUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Given article from different tenant, when deleting, then throws not found', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.delete('test-article', mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
