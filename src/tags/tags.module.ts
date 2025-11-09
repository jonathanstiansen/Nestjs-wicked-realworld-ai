import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { TenantContext } from '../tenants/tenant-context';
import { ArticlesModule } from '../articles/articles.module';

/**
 * Tags module
 */
@Module({
  imports: [ArticlesModule], // For article tag access
  controllers: [TagsController],
  providers: [TagsService, TenantContext],
  exports: [TagsService],
})
export class TagsModule {}
