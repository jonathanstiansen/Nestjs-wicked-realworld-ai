import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: CommentsService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
  };

  const mockComment = {
    id: 'comment-1',
    articleSlug: 'test-article',
    body: 'Test comment',
    authorId: mockUser.id,
    author: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: {
            create: jest.fn(),
            findByArticleSlug: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get<CommentsService>(CommentsService);
  });

  describe('Scenario: Create comment', () => {
    it('Given valid comment data, when creating, then returns created comment', async () => {
      // Arrange
      const createDto: CreateCommentDto = { body: 'Test comment' };
      const mockRequest = { user: mockUser };

      jest.spyOn(commentsService, 'create').mockResolvedValue(mockComment as any);

      // Act
      const result = await controller.create('test-article', createDto, mockRequest as any);

      // Assert
      expect(commentsService.create).toHaveBeenCalledWith('test-article', createDto.body, mockUser.id);
      expect(result).toEqual({
        comment: expect.objectContaining({
          id: 'comment-1',
          body: 'Test comment',
        }),
      });
    });
  });

  describe('Scenario: List comments for article', () => {
    it('Given article has comments, when listing, then returns comments array', async () => {
      // Arrange
      jest.spyOn(commentsService, 'findByArticleSlug').mockResolvedValue([mockComment as any]);

      // Act
      const result = await controller.list('test-article');

      // Assert
      expect(commentsService.findByArticleSlug).toHaveBeenCalledWith('test-article');
      expect(result).toEqual({
        comments: expect.arrayContaining([
          expect.objectContaining({ body: 'Test comment' }),
        ]),
      });
    });
  });

  describe('Scenario: Delete comment', () => {
    it('Given comment exists, when deleting, then removes comment', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      jest.spyOn(commentsService, 'delete').mockResolvedValue(undefined);

      // Act
      await controller.delete('test-article', 'comment-1', mockRequest as any);

      // Assert
      expect(commentsService.delete).toHaveBeenCalledWith('comment-1', mockUser.id);
    });
  });
});
