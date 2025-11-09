import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { TenantContext } from '../tenants/tenant-context';
import { ArticlesModule } from '../articles/articles.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Comments module
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    ArticlesModule, // For article validation
    AuthModule, // For JwtAuthGuard
  ],
  controllers: [CommentsController],
  providers: [CommentsService, TenantContext],
  exports: [CommentsService, TypeOrmModule],
})
export class CommentsModule {}
