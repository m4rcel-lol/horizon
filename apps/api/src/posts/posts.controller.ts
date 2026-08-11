import { Body, Controller, Get, HttpException, Param, Post, Query } from "@nestjs/common";
import { IsString, Length } from "class-validator";
import { PostsService } from "./posts.service";
import { DirectoryError } from "../users/user-directory.service";

class CreatePostDto {
  @IsString()
  @Length(1, 20)
  author!: string;

  @IsString()
  @Length(1, 500)
  content!: string;
}

/**
 * Posts.
 *
 * Authorization is not enforced yet — there is no auth module, so the author
 * comes from the request body. When auth lands it must come from the session.
 */
@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  private async unwrap<T>(fn: () => Promise<T> | T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DirectoryError) {
        throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
      }
      throw error;
    }
  }

  /** The timeline, newest first. `author` narrows it to one account. */
  @Get()
  async list(@Query("author") author?: string) {
    return { posts: await this.posts.list(author) };
  }

  @Post()
  async create(@Body() body: CreatePostDto) {
    return this.unwrap(async () => ({ post: await this.posts.create(body) }));
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.unwrap(async () => ({ post: await this.posts.get(id) }));
  }
}
