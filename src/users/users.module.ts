import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Follow } from './follow.entity';
import { UsersService } from './users.service';
import { FollowsService } from './follows.service';
import { UsersController } from './users.controller';
import { ProfilesController } from './profiles.controller';
import { TenantContext } from '../tenants/tenant-context';
import { AuthModule } from '../auth/auth.module';

/**
 * Users module with follow support
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Follow]),
    AuthModule, // For JwtAuthGuard
  ],
  controllers: [UsersController, ProfilesController],
  providers: [UsersService, FollowsService, TenantContext],
  exports: [UsersService, FollowsService, TypeOrmModule],
})
export class UsersModule {}
