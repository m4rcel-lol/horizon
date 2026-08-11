import { Body, Controller, Get, HttpException, Param, Post, Query } from "@nestjs/common";
import { IsString, Length } from "class-validator";
import { PostsService } from "./posts.service";
import { DirectoryError } from "../users/user-directory.service";
import { CurrentUser, Public } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/authenticated-user";

class CreatePostDto {
  @IsString()
  @Length(1, 500)
  content!: string;
}

/**
 * Posts.
 *
 * Reading is open; posting needs a session, and the author is taken from that
 * session. It used to come from the request body, which meant anyone could
 * post as anyone.
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
  @Public()
  @Get()
  async list(@Query("author") author?: string) {
    return { posts: await this.posts.list(author) };
  }

  @Post()
  async create(@Body() body: CreatePostDto, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({
      post: await this.posts.create({ author: auth.username, content: body.content }),
    }));
  }

  @Public()
  @Get(":id")
  async get(@Param("id") id: string) {
    return this.unwrap(async () => ({ post: await this.posts.get(id) }));
  }
}
