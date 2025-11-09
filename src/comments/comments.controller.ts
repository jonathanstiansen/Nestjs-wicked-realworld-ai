import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCommentDto } from './dto/comment.dto';

/**
 * Comments REST API controller
 */
@Controller('api/articles/:slug/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async list(@Param('slug') slug: string) {
    const comments = await this.commentsService.findByArticleSlug(slug);
    return { comments };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('slug') slug: string,
    @Body(ValidationPipe) createDto: CreateCommentDto,
    @Request() req,
  ) {
    const comment = await this.commentsService.create(slug, createDto.body, req.user.id);
    return { comment };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    await this.commentsService.delete(id, req.user.id);
  }
}
