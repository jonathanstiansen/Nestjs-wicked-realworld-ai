import { Controller, Get } from '@nestjs/common';
import { TagsService } from './tags.service';

/**
 * Tags REST API controller
 */
@Controller('api/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list() {
    const tags = await this.tagsService.findAll();
    return { tags };
  }
}
