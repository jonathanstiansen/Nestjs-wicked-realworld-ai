import { Test, TestingModule } from '@nestjs/testing';
import { FeedsService } from './feeds.service';
import { Repository } from 'typeorm';
import { Article } from '../articles/article.entity';
import { Follow } from '../users/follow.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';

describe('FeedsService', () => {
  let service: FeedsService;
  let articleRepository: Repository<Article>;
  let followRepository: Repository<Follow>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  const mockArticles: Article[] = [
    {
      id: 'article-1',
      tenantId: mockTenantId,
      authorId: 'user-2',
      slug: 'article-1',
      title: 'Article 1',
      description: 'Description 1',
      body: 'Body 1',
      tagList: ['tag1'],
      favoritesCount: 0,
      tenant: null,
      author: null,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
    {
      id: 'article-2',
      tenantId: mockTenantId,
      authorId: 'user-3',
      slug: 'article-2',
      title: 'Article 2',
      description: 'Description 2',
      body: 'Body 2',
      tagList: ['tag2'],
      favoritesCount: 5,
      tenant: null,
      author: null,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 'article-3',
      tenantId: mockTenantId,
      authorId: 'user-4',
      slug: 'article-3',
      title: 'Article 3',
      description: 'Description 3',
      body: 'Body 3',
      tagList: [],
      favoritesCount: 2,
      tenant: null,
      author: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockFollows = [
    { followerId: mockUserId, followingId: 'user-2' },
    { followerId: mockUserId, followingId: 'user-3' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedsService,
        {
          provide: getRepositoryToken(Article),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            find: jest.fn(),
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

    service = module.get<FeedsService>(FeedsService);
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    followRepository = module.get<Repository<Follow>>(getRepositoryToken(Follow));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Get personal feed', () => {
    it('Given user follows other users, when fetching personal feed, then returns articles from followed users only', async () => {
      // Arrange
      const query = { limit: 20, offset: 0 };

      jest.spyOn(followRepository, 'find').mockResolvedValue(mockFollows as any);

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockArticles[0], mockArticles[1]]),
      };

      jest.spyOn(articleRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      // Act
      const result = await service.getPersonalFeed(mockUserId, query);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(followRepository.find).toHaveBeenCalledWith({
        where: { followerId: mockUserId, tenantId: mockTenantId },
        select: ['followingId'],
      });
      expect(queryBuilder.where).toHaveBeenCalledWith('article.tenantId = :tenantId', {
        tenantId: mockTenantId,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('article.authorId IN (:...authorIds)', {
        authorIds: ['user-2', 'user-3'],
      });
      expect(result).toHaveLength(2);
    });

    it('Given user follows no one, when fetching personal feed, then returns empty array', async () => {
      // Arrange
      const query = { limit: 20, offset: 0 };

      jest.spyOn(followRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.getPersonalFeed(mockUserId, query);

      // Assert
      expect(result).toEqual([]);
    });

    it('Given pagination params, when fetching personal feed, then applies limit and offset', async () => {
      // Arrange
      const query = { limit: 10, offset: 5 };

      jest.spyOn(followRepository, 'find').mockResolvedValue(mockFollows as any);

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockArticles[0]]),
      };

      jest.spyOn(articleRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      // Act
      await service.getPersonalFeed(mockUserId, query);

      // Assert
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    });
  });

  describe('Scenario: Get global feed', () => {
    it('Given articles exist in tenant, when fetching global feed, then returns all articles ordered by date', async () => {
      // Arrange
      const query = { limit: 20, offset: 0 };

      jest.spyOn(articleRepository, 'find').mockResolvedValue(mockArticles);

      // Act
      const result = await service.getGlobalFeed(query);

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(articleRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        relations: ['author'],
        order: { createdAt: 'DESC' },
        take: 20,
        skip: 0,
      });
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('article-1'); // Most recent
    });

    it('Given pagination params, when fetching global feed, then applies limit and offset', async () => {
      // Arrange
      const query = { limit: 5, offset: 10 };

      jest.spyOn(articleRepository, 'find').mockResolvedValue([mockArticles[0]]);

      // Act
      await service.getGlobalFeed(query);

      // Assert
      expect(articleRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        }),
      );
    });

    it('Given no articles in tenant, when fetching global feed, then returns empty array', async () => {
      // Arrange
      const query = { limit: 20, offset: 0 };

      jest.spyOn(articleRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.getGlobalFeed(query);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
