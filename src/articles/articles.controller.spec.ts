import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { FavoritesService } from './favorites.service';
import { FeedsService } from './feeds.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let articlesService: ArticlesService;
  let favoritesService: FavoritesService;
  let feedsService: FeedsService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockArticle = {
    id: 'article-1',
    slug: 'test-article',
    title: 'Test Article',
    description: 'Test description',
    body: 'Test body',
    tagList: ['test'],
    favoritesCount: 0,
    author: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        {
          provide: ArticlesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findBySlug: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: FavoritesService,
          useValue: {
            favorite: jest.fn(),
            unfavorite: jest.fn(),
          },
        },
        {
          provide: FeedsService,
          useValue: {
            getPersonalFeed: jest.fn(),
            getGlobalFeed: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    articlesService = module.get<ArticlesService>(ArticlesService);
    favoritesService = module.get<FavoritesService>(FavoritesService);
    feedsService = module.get<FeedsService>(FeedsService);
  });

  describe('Scenario: Create article', () => {
    it('Given valid article data, when creating, then returns created article', async () => {
      // Arrange
      const createDto: CreateArticleDto = {
        title: 'New Article',
        description: 'Description',
        body: 'Body content',
        tagList: ['test'],
      };

      const mockRequest = { user: mockUser };

      jest.spyOn(articlesService, 'create').mockResolvedValue(mockArticle as any);

      // Act
      const result = await controller.create(createDto, mockRequest as any);

      // Assert
      expect(articlesService.create).toHaveBeenCalledWith(createDto, mockUser.id);
      expect(result).toEqual({
        article: expect.objectContaining({
          slug: 'test-article',
          title: 'Test Article',
        }),
      });
    });
  });

  describe('Scenario: List articles', () => {
    it('Given articles exist, when listing, then returns articles array', async () => {
      // Arrange
      const query = { limit: 20, offset: 0 };
      jest.spyOn(articlesService, 'findAll').mockResolvedValue([mockArticle as any]);

      // Act
      const result = await controller.list(query);

      // Assert
      expect(articlesService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        articles: expect.arrayContaining([
          expect.objectContaining({ slug: 'test-article' }),
        ]),
        articlesCount: 1,
      });
    });
  });

  describe('Scenario: Get article by slug', () => {
    it('Given article exists, when getting by slug, then returns article', async () => {
      // Arrange
      jest.spyOn(articlesService, 'findBySlug').mockResolvedValue(mockArticle as any);

      // Act
      const result = await controller.getBySlug('test-article');

      // Assert
      expect(articlesService.findBySlug).toHaveBeenCalledWith('test-article');
      expect(result).toEqual({
        article: expect.objectContaining({ slug: 'test-article' }),
      });
    });
  });

  describe('Scenario: Update article', () => {
    it('Given valid update data, when updating, then returns updated article', async () => {
      // Arrange
      const updateDto: UpdateArticleDto = { title: 'Updated Title' };
      const mockRequest = { user: mockUser };

      jest.spyOn(articlesService, 'update').mockResolvedValue({
        ...mockArticle,
        title: 'Updated Title',
      } as any);

      // Act
      const result = await controller.update('test-article', updateDto, mockRequest as any);

      // Assert
      expect(articlesService.update).toHaveBeenCalledWith('test-article', updateDto, mockUser.id);
      expect(result.article.title).toBe('Updated Title');
    });
  });

  describe('Scenario: Delete article', () => {
    it('Given article exists, when deleting, then removes article', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      jest.spyOn(articlesService, 'delete').mockResolvedValue(undefined);

      // Act
      await controller.delete('test-article', mockRequest as any);

      // Assert
      expect(articlesService.delete).toHaveBeenCalledWith('test-article', mockUser.id);
    });
  });

  describe('Scenario: Favorite/Unfavorite article', () => {
    it('Given article exists, when favoriting, then adds favorite', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      jest.spyOn(favoritesService, 'favorite').mockResolvedValue(undefined);
      jest.spyOn(articlesService, 'findBySlug').mockResolvedValue({
        ...mockArticle,
        favoritesCount: 1,
      } as any);

      // Act
      const result = await controller.favorite('test-article', mockRequest as any);

      // Assert
      expect(favoritesService.favorite).toHaveBeenCalledWith('test-article', mockUser.id);
      expect(result.article.favoritesCount).toBe(1);
    });

    it('Given article is favorited, when unfavoriting, then removes favorite', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      jest.spyOn(favoritesService, 'unfavorite').mockResolvedValue(undefined);
      jest.spyOn(articlesService, 'findBySlug').mockResolvedValue(mockArticle as any);

      // Act
      await controller.unfavorite('test-article', mockRequest as any);

      // Assert
      expect(favoritesService.unfavorite).toHaveBeenCalledWith('test-article', mockUser.id);
    });
  });

  describe('Scenario: Get feeds', () => {
    it('Given user follows others, when getting personal feed, then returns followed articles', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const query = { limit: 20, offset: 0 };
      jest.spyOn(feedsService, 'getPersonalFeed').mockResolvedValue([mockArticle as any]);

      // Act
      const result = await controller.getFeed(query, mockRequest as any);

      // Assert
      expect(feedsService.getPersonalFeed).toHaveBeenCalledWith(mockUser.id, query);
      expect(result.articles).toHaveLength(1);
    });
  });
});
