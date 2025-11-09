import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Profiles REST API controller
 */
@Controller('api/profiles')
export class ProfilesController {
  constructor(
    private readonly usersService: UsersService,
    private readonly followsService: FollowsService,
  ) {}

  @Get(':username')
  async getProfile(@Param('username') username: string, @Request() req) {
    const user = await this.usersService.findByUsername(username);

    let following = false;
    if (req.user) {
      following = await this.followsService.isFollowing(req.user.id, user.id);
    }

    return {
      profile: {
        username: user.username,
        bio: user.bio,
        image: user.image,
        following,
      },
    };
  }

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  async followUser(@Param('username') username: string, @Request() req) {
    const user = await this.usersService.findByUsername(username);
    await this.followsService.follow(req.user.id, user.id);

    const following = await this.followsService.isFollowing(req.user.id, user.id);

    return {
      profile: {
        username: user.username,
        bio: user.bio,
        image: user.image,
        following,
      },
    };
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  async unfollowUser(@Param('username') username: string, @Request() req) {
    const user = await this.usersService.findByUsername(username);
    await this.followsService.unfollow(req.user.id, user.id);

    const following = await this.followsService.isFollowing(req.user.id, user.id);

    return {
      profile: {
        username: user.username,
        bio: user.bio,
        image: user.image,
        following,
      },
    };
  }
}
