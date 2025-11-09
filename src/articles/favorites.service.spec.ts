import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesService } from './favorites.service';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { Article } from './article.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favoriteRepository: Repository<Favorite>;
  let articleRepository: Repository<Article>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockArticleId = 'article-1';

  const mockArticle: Article = {
    id: mockArticleId,
    tenantId: mockTenantId,
    authorId: 'user-2',
    slug: 'test-article',
    title: 'Test Article',
    description: 'Description',
    body: 'Body',
    tagList: [],
    favoritesCount: 0,
    tenant: null,
    author: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFavorite: Favorite = {
    id: 'favorite-1',
    tenantId: mockTenantId,
    userId: mockUserId,
    articleId: mockArticleId,
    tenant: null,
    user: null,
    article: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Article),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
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

    service = module.get<FavoritesService>(FavoritesService);
    favoriteRepository = module.get<Repository<Favorite>>(getRepositoryToken(Favorite));
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Favorite an article', () => {
    it('Given article exists in tenant, when user favorites it, then favorite is created and count incremented', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(favoriteRepository, 'create').mockReturnValue(mockFavorite);
      jest.spyOn(favoriteRepository, 'save').mockResolvedValue(mockFavorite);
      jest.spyOn(articleRepository, 'increment').mockResolvedValue(undefined);

      // Act
      await service.favorite('test-article', mockUserId);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(articleRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-article', tenantId: mockTenantId },
      });
      expect(favoriteRepository.save).toHaveBeenCalled();
      expect(articleRepository.increment).toHaveBeenCalledWith(
        { id: mockArticleId },
        'favoritesCount',
        1,
      );
    });

    it('Given article already favorited, when user favorites again, then returns idempotent success', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(mockFavorite);

      // Act
      await service.favorite('test-article', mockUserId);

      // Assert
      expect(favoriteRepository.save).not.toHaveBeenCalled();
      expect(articleRepository.increment).not.toHaveBeenCalled();
    });

    it('Given article from different tenant, when favoriting, then throws not found', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.favorite('test-article', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Scenario: Unfavorite an article', () => {
    it('Given article is favorited, when user unfavorites it, then favorite is removed and count decremented', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(mockFavorite);
      jest.spyOn(favoriteRepository, 'delete').mockResolvedValue({ affected: 1, raw: {} });
      jest.spyOn(articleRepository, 'decrement').mockResolvedValue(undefined);

      // Act
      await service.unfavorite('test-article', mockUserId);

      // Assert
      expect(favoriteRepository.delete).toHaveBeenCalledWith({
        id: mockFavorite.id,
        tenantId: mockTenantId,
      });
      expect(articleRepository.decrement).toHaveBeenCalledWith(
        { id: mockArticleId },
        'favoritesCount',
        1,
      );
    });

    it('Given article not favorited, when user unfavorites, then returns idempotent success', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(null);

      // Act
      await service.unfavorite('test-article', mockUserId);

      // Assert
      expect(favoriteRepository.delete).not.toHaveBeenCalled();
      expect(articleRepository.decrement).not.toHaveBeenCalled();
    });

    it('Given article from different tenant, when unfavoriting, then throws not found', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.unfavorite('test-article', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
