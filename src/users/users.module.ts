import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Follow } from './follow.entity';
import { FollowsService } from './follows.service';
import { TenantContext } from '../tenants/tenant-context';

/**
 * Users module with follow support
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Follow])],
  providers: [FollowsService, TenantContext],
  exports: [FollowsService, TypeOrmModule],
})
export class UsersModule {}
