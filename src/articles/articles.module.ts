import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { Favorite } from './favorite.entity';
import { ArticlesService } from './articles.service';
import { FavoritesService } from './favorites.service';
import { FeedsService } from './feeds.service';
import { ArticlesController } from './articles.controller';
import { TenantContext } from '../tenants/tenant-context';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Articles module with favorites and feeds support
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Favorite]),
    UsersModule, // For Follow entity in FeedsService
    AuthModule, // For JwtAuthGuard
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService, FavoritesService, FeedsService, TenantContext],
  exports: [ArticlesService, FavoritesService, FeedsService, TypeOrmModule],
})
export class ArticlesModule {}
