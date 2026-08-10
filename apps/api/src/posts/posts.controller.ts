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

  private unwrap<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof DirectoryError) {
        throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
      }
      throw error;
    }
  }

  /** The timeline, newest first. `author` narrows it to one account. */
  @Get()
  list(@Query("author") author?: string) {
    return { posts: this.posts.list(author) };
  }

  @Post()
  create(@Body() body: CreatePostDto) {
    return this.unwrap(() => ({ post: this.posts.create(body) }));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.unwrap(() => ({ post: this.posts.get(id) }));
  }
}
