import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';
import { TenantContext } from '../tenants/tenant-context';
import { ArticlesModule } from '../articles/articles.module';

/**
 * Comments module
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    ArticlesModule, // For article validation
  ],
  providers: [CommentsService, TenantContext],
  exports: [CommentsService, TypeOrmModule],
})
export class CommentsModule {}
