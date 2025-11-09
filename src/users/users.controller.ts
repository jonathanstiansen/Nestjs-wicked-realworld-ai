import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Users REST API controller for current user management
 */
@Controller('api/user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getCurrentUser(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    return {
      user: {
        email: user.email,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };
  }

  @Put()
  async updateCurrentUser(
    @Body(ValidationPipe) updateDto: UpdateUserDto,
    @Request() req,
  ) {
    const user = await this.usersService.update(req.user.id, updateDto);
    return {
      user: {
        email: user.email,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };
  }
}
