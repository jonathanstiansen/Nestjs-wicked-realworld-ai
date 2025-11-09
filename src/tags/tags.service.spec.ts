import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { Repository } from 'typeorm';
import { Article } from '../articles/article.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContext } from '../tenants/tenant-context';

describe('TagsService', () => {
  let service: TagsService;
  let articleRepository: Repository<Article>;
  let tenantContext: TenantContext;

  const mockTenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Article),
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

    service = module.get<TagsService>(TagsService);
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    tenantContext = module.get<TenantContext>(TenantContext);
  });

  describe('Scenario: Get all tags within tenant', () => {
    it('Given articles with tags exist, when fetching tags, then returns unique tags from current tenant only', async () => {
      // Arrange
      const mockArticles = [
        { tagList: ['javascript', 'node', 'testing'] },
        { tagList: ['javascript', 'typescript'] },
        { tagList: ['node', 'backend'] },
        { tagList: [] },
      ];

      jest.spyOn(articleRepository, 'find').mockResolvedValue(mockArticles as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(articleRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: ['tagList'],
      });
      expect(result).toEqual(
        expect.arrayContaining(['javascript', 'node', 'testing', 'typescript', 'backend']),
      );
      expect(result).toHaveLength(5); // Unique tags
      expect(result.filter(tag => tag === 'javascript')).toHaveLength(1); // No duplicates
    });

    it('Given no articles exist, when fetching tags, then returns empty array', async () => {
      // Arrange
      jest.spyOn(articleRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('Given all articles have empty tag lists, when fetching tags, then returns empty array', async () => {
      // Arrange
      const mockArticles = [
        { tagList: [] },
        { tagList: [] },
      ];

      jest.spyOn(articleRepository, 'find').mockResolvedValue(mockArticles as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
