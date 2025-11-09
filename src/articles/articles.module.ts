import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { Favorite } from './favorite.entity';
import { ArticlesService } from './articles.service';
import { FavoritesService } from './favorites.service';
import { TenantContext } from '../tenants/tenant-context';

/**
 * Articles module with favorites support
 */
@Module({
  imports: [TypeOrmModule.forFeature([Article, Favorite])],
  providers: [ArticlesService, FavoritesService, TenantContext],
  exports: [ArticlesService, FavoritesService, TypeOrmModule],
})
export class ArticlesModule {}
