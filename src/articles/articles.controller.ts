import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { FavoritesService } from './favorites.service';
import { FeedsService } from './feeds.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateArticleDto, UpdateArticleDto, ListArticlesQueryDto } from './dto/article.dto';

/**
 * Articles REST API controller
 */
@Controller('api/articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly favoritesService: FavoritesService,
    private readonly feedsService: FeedsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body(ValidationPipe) createDto: CreateArticleDto, @Request() req) {
    const article = await this.articlesService.create(createDto, req.user.id);
    return { article };
  }

  @Get()
  async list(@Query(ValidationPipe) query: ListArticlesQueryDto) {
    const articles = await this.articlesService.findAll(query);
    return {
      articles,
      articlesCount: articles.length,
    };
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  async getFeed(@Query(ValidationPipe) query: ListArticlesQueryDto, @Request() req) {
    const articles = await this.feedsService.getPersonalFeed(req.user.id, query);
    return {
      articles,
      articlesCount: articles.length,
    };
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const article = await this.articlesService.findBySlug(slug);
    return { article };
  }

  @Put(':slug')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('slug') slug: string,
    @Body(ValidationPipe) updateDto: UpdateArticleDto,
    @Request() req,
  ) {
    const article = await this.articlesService.update(slug, updateDto, req.user.id);
    return { article };
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('slug') slug: string, @Request() req) {
    await this.articlesService.delete(slug, req.user.id);
  }

  @Post(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async favorite(@Param('slug') slug: string, @Request() req) {
    await this.favoritesService.favorite(slug, req.user.id);
    const article = await this.articlesService.findBySlug(slug);
    return { article };
  }

  @Delete(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async unfavorite(@Param('slug') slug: string, @Request() req) {
    await this.favoritesService.unfavorite(slug, req.user.id);
    const article = await this.articlesService.findBySlug(slug);
    return { article };
  }
}
