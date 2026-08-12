import { Body, Controller, Delete, Get, HttpException, Param, Post, Put, Query } from "@nestjs/common";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PostsService } from "./posts.service";
import { ScheduledPostsService } from "./scheduled-posts.service";
import { DirectoryError } from "../users/user-directory.service";
import { CurrentUser, Public, RequirePermissions } from "../auth/auth.decorators";
import { has, type AuthenticatedUser } from "../auth/authenticated-user";
import { PERMISSIONS } from "@horizon/shared";

class PollDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  options!: string[];

  /** Five minutes to a week, matching what the composer offers. */
  @IsInt()
  @Min(5)
  @Max(10080)
  durationMinutes!: number;
}

class CreatePostDto {
  // A post with an image or a poll needs no words, so the floor is zero when
  // something else carries it. Checked in the handler, where both are visible.
  @IsString()
  @Length(0, 500)
  content!: string;

  /** Up to four uploads from POST /media/upload?kind=post. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  mediaIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PollDto)
  poll?: PollDto;

  /** ISO timestamp. Present means "write it now, publish it then". */
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

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

  @IsOptional()
  @IsIn(["PUBLIC", "FOLLOWERS", "MENTIONED", "PRIVATE"])
  visibility?: "PUBLIC" | "FOLLOWERS" | "MENTIONED" | "PRIVATE";

  /** Post into this community (by slug). */
  @IsOptional()
  @IsString()
  @Length(1, 60)
  communitySlug?: string;
}

class SetFlagDto {
  @IsBoolean()
  on!: boolean;
}

class VoteDto {
  @IsString()
  @Length(1, 64)
  optionId!: string;
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
  constructor(
    private readonly posts: PostsService,
    private readonly scheduled: ScheduledPostsService,
  ) {}

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

  /**
   * Posts as a moderator needs to find them. Declared before `:id` so
   * "moderation" is matched as a literal segment rather than a post id.
   */
  @RequirePermissions(PERMISSIONS.POSTS_VIEW)
  @Get("moderation/search")
  async moderationSearch(
    @Query("q") q?: string,
    @Query("author") author?: string,
    @Query("page") page?: string,
  ) {
    return this.unwrap(() =>
      this.posts.moderationSearch({
        query: q,
        author,
        page: page ? Number(page) : undefined,
      }),
    );
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
    return this.unwrap(async () => {
      const hasContent =
        body.content.trim().length > 0 || (body.mediaIds?.length ?? 0) > 0 || Boolean(body.poll);
      if (!hasContent) {
        throw new DirectoryError("EMPTY_POST", "Write something, or attach an image or poll.", 400);
      }

      // Scheduling stores the intent; the publisher turns it into a post when
      // the time comes. A poll is not schedulable — its clock starts when it
      // is published, which would make the chosen duration meaningless.
      if (body.scheduledFor) {
        if (body.poll) {
          throw new DirectoryError(
            "POLL_NOT_SCHEDULABLE",
            "A poll cannot be scheduled; its timer starts when it is posted.",
            400,
          );
        }
        return this.scheduled.schedule({
          userId: auth.id,
          username: auth.username,
          content: body.content,
          scheduledFor: new Date(body.scheduledFor),
          replyToId: body.replyToId,
          quoteOfId: body.quoteOfId,
          mediaIds: body.mediaIds,
        });
      }

      return {
        post: await this.posts.create({
          author: auth.username,
          content: body.content,
          replyToId: body.replyToId,
          quoteOfId: body.quoteOfId,
          mediaIds: body.mediaIds,
          poll: body.poll,
          viewerId: auth.id,
          visibility: body.visibility,
          communitySlug: body.communitySlug,
        }),
      };
    });
  }

  /** Posts written but not yet published. */
  @Get("scheduled/mine")
  async scheduledPosts(@CurrentUser() auth: AuthenticatedUser) {
    return { scheduled: await this.scheduled.list(auth.id) };
  }

  @Delete("scheduled/:id")
  async cancelScheduled(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(() => this.scheduled.cancel(id, auth.id));
  }

  /** One vote per account, changeable while the poll is open. */
  @Post(":id/poll/vote")
  async vote(
    @Param("id") id: string,
    @Body() body: VoteDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(async () => ({
      post: await this.posts.votePoll(id, body.optionId, auth.id),
    }));
  }

  @Public()
  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser | null) {
    // true: the post's own page is where a pending note can be rated.
    return this.unwrap(async () => ({ post: await this.posts.get(id, auth?.id ?? null, true) }));
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
  async remove(
    @Param("id") id: string,
    @CurrentUser() auth: AuthenticatedUser,
    @Query("reason") reason?: string,
  ) {
    return this.unwrap(() =>
      this.posts.remove(id, auth.id, has(auth, PERMISSIONS.POSTS_DELETE), reason),
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
