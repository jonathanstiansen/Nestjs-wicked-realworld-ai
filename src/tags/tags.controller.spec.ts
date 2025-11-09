import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let tagsService: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    tagsService = module.get<TagsService>(TagsService);
  });

  describe('Scenario: Get all tags', () => {
    it('Given tags exist, when getting all tags, then returns tags array', async () => {
      // Arrange
      const mockTags = ['testing', 'tdd', 'nestjs'];
      jest.spyOn(tagsService, 'findAll').mockResolvedValue(mockTags);

      // Act
      const result = await controller.list();

      // Assert
      expect(tagsService.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        tags: mockTags,
      });
    });
  });
});
