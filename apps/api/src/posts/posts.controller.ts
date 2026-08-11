import { Body, Controller, Delete, Get, HttpException, Param, Post, Put, Query } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, Length } from "class-validator";
import { PostsService } from "./posts.service";
import { DirectoryError } from "../users/user-directory.service";
import { CurrentUser, Public } from "../auth/auth.decorators";
import { has, type AuthenticatedUser } from "../auth/authenticated-user";
import { PERMISSIONS } from "@horizon/shared";

class CreatePostDto {
  @IsString()
  @Length(1, 500)
  content!: string;

  /** Makes this a reply to that post. */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  replyToId?: string;

  /** Makes this a quote of that post: your words above, theirs embedded below. */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  quoteOfId?: string;
}

class SetFlagDto {
  @IsBoolean()
  on!: boolean;
}

/**
 * Posts.
 *
 * Reading is open; writing and reacting need a session, and the actor is taken
 * from it. It used to come from the request body, which meant anyone could
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
  async list(@CurrentUser() auth: AuthenticatedUser | null, @Query("author") author?: string) {
    return { posts: await this.posts.list(author, auth?.id ?? null) };
  }

  /** Chronological, only the accounts you follow. */
  @Get("following")
  async following(@CurrentUser() auth: AuthenticatedUser) {
    return { posts: await this.posts.following(auth.id) };
  }

  @Post()
  async create(@Body() body: CreatePostDto, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({
      post: await this.posts.create({
        author: auth.username,
        content: body.content,
        replyToId: body.replyToId,
        quoteOfId: body.quoteOfId,
        viewerId: auth.id,
      }),
    }));
  }

  @Public()
  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser | null) {
    return this.unwrap(async () => ({ post: await this.posts.get(id, auth?.id ?? null) }));
  }

  @Public()
  @Get(":id/replies")
  async replies(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser | null) {
    return this.unwrap(async () => ({ posts: await this.posts.replies(id, auth?.id ?? null) }));
  }

  /**
   * PUT rather than POST: sending the state you want is idempotent, so a
   * double tap or a retried request cannot leave the count drifting.
   */
  @Put(":id/like")
  async like(
    @Param("id") id: string,
    @Body() body: SetFlagDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(async () => ({ post: await this.posts.setLike(id, auth.id, body.on) }));
  }

  /** The author may delete their own; a moderator may delete anyone's. */
  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(() =>
      this.posts.remove(id, auth.id, has(auth, PERMISSIONS.POSTS_DELETE)),
    );
  }

  @Put(":id/repost")
  async repost(
    @Param("id") id: string,
    @Body() body: SetFlagDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(async () => ({ post: await this.posts.setRepost(id, auth.id, body.on) }));
  }
}
