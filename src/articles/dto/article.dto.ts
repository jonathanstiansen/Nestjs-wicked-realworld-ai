import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsArray()
  @IsOptional()
  tagList?: string[];
}

export class UpdateArticleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsArray()
  @IsOptional()
  tagList?: string[];
}

export class ListArticlesQueryDto {
  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  favorited?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number = 20;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number = 0;
}
