import { Body, Controller, Get, HttpException, Param, Post, Put, Query } from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { SocialService } from "./social.service";
import { NotificationsService } from "./notifications.service";
import { PostsService } from "../posts/posts.service";
import { DirectoryError } from "../users/directory-error";
import { CurrentUser, Public } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/authenticated-user";

class SetFlagDto {
  @IsBoolean()
  on!: boolean;
}

class ApproveDto {
  @IsBoolean()
  approve!: boolean;
}

async function unwrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DirectoryError) {
      throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
    }
    throw error;
  }
}

/** Following, and the lists on either side of it. */
@Controller("users")
export class FollowController {
  constructor(private readonly social: SocialService) {}

  @Put(":username/follow")
  async setFollow(
    @Param("username") username: string,
    @Body() body: SetFlagDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return unwrap(() => this.social.setFollow(auth.id, username, body.on));
  }

  /**
   * People waiting for you to approve their follow.
   *
   * Declared before the `:username/...` routes below so that the literal
   * segment wins the match rather than being read as a username.
   */
  @Get("follow-requests/mine")
  async followRequests(@CurrentUser() auth: AuthenticatedUser) {
    return unwrap(async () => ({ users: await this.social.followRequests(auth.id) }));
  }

  /** Approve or decline one of them. Only the account being followed may. */
  @Post("follow-requests/:username")
  async resolveFollowRequest(
    @Param("username") username: string,
    @Body() body: ApproveDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return unwrap(() => this.social.resolveFollowRequest(auth.id, username, body.approve));
  }

  /** Whether the caller follows them, and whether they follow back. */
  @Public()
  @Get(":username/relationship")
  async relationship(
    @Param("username") username: string,
    @CurrentUser() auth: AuthenticatedUser | null,
  ) {
    return unwrap(() => this.social.relationship(auth?.id ?? null, username));
  }

  @Public()
  @Get(":username/followers")
  async followers(@Param("username") username: string) {
    return unwrap(async () => ({ users: await this.social.followers(username) }));
  }

  @Public()
  @Get(":username/following")
  async following(@Param("username") username: string) {
    return unwrap(async () => ({ users: await this.social.following(username) }));
  }
}

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() auth: AuthenticatedUser, @Query("filter") filter?: string) {
    return {
      notifications: await this.notifications.list(
        auth.id,
        filter === "mentions" ? "mentions" : "all",
      ),
    };
  }

  /** Polled for the badge on the navigation, so it stays cheap: one count. */
  @Get("unread-count")
  async unread(@CurrentUser() auth: AuthenticatedUser) {
    return { count: await this.notifications.unreadCount(auth.id) };
  }

  @Post("read")
  async markRead(@CurrentUser() auth: AuthenticatedUser) {
    return this.notifications.markAllRead(auth.id);
  }
}

@Controller("bookmarks")
export class BookmarksController {
  constructor(
    private readonly social: SocialService,
    private readonly posts: PostsService,
  ) {}

  @Get()
  async list(@CurrentUser() auth: AuthenticatedUser) {
    const ids = await this.social.bookmarks(auth.id);
    return { posts: await this.posts.byIds(ids, auth.id) };
  }

  @Put(":postId")
  async set(
    @Param("postId") postId: string,
    @Body() body: SetFlagDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return unwrap(() => this.social.setBookmark(auth.id, postId, body.on));
  }
}

@Controller("search")
export class SearchController {
  constructor(
    private readonly social: SocialService,
    private readonly posts: PostsService,
  ) {}

  /** Accounts and posts for one query, so the page needs a single request. */
  @Public()
  @Get()
  async search(@Query("q") q: string, @CurrentUser() auth: AuthenticatedUser | null) {
    const query = (q ?? "").trim();
    if (!query) return { query: "", users: [], posts: [] };
    const [users, postIds] = await Promise.all([
      this.social.searchUsers(query),
      this.social.searchPostIds(query),
    ]);
    return { query, users, posts: await this.posts.byIds(postIds, auth?.id ?? null) };
  }
}
