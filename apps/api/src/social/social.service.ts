import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";
import { UserDirectoryService, type PresentedUser } from "../users/user-directory.service";
import { NotificationsService } from "./notifications.service";

/**
 * Follows, bookmarks and search.
 *
 * All three were modelled in the schema and reachable in the interface, but
 * nothing was behind them: the Follow button had no handler, the bookmarks
 * page was an empty state, and the search box was an inert input.
 */
@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UserDirectoryService,
    private readonly notifications: NotificationsService,
  ) {}

  private async requireUser(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, status: { not: "DELETED" } },
      select: { id: true, username: true, isSystem: true },
    });
    if (!user) {
      throw new DirectoryError("USER_NOT_FOUND", `No account @${username} on this instance.`, 404);
    }
    return user;
  }

  /**
   * Follow or unfollow. Sending the state you want rather than toggling, so a
   * retried request cannot land you on the opposite of what you asked for.
   */
  async setFollow(followerId: string, username: string, following: boolean) {
    const target = await this.requireUser(username);
    if (target.id === followerId) {
      throw new DirectoryError("CANNOT_FOLLOW_SELF", "You cannot follow yourself.", 400);
    }

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: target.id } },
      select: { followerId: true },
    });

    if (following && !existing) {
      await this.prisma.follow.create({ data: { followerId, followingId: target.id } });
      await this.notifications.record({
        recipientId: target.id,
        actorId: followerId,
        type: "FOLLOW",
      });
    } else if (!following && existing) {
      await this.prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId: target.id } },
      });
      await this.notifications.withdraw({
        recipientId: target.id,
        actorId: followerId,
        type: "FOLLOW",
      });
    }

    return { user: await this.directory.get(username), following };
  }

  /** Does the caller follow this account, and does it follow them back? */
  async relationship(viewerId: string | null, username: string) {
    const target = await this.requireUser(username);
    if (!viewerId || viewerId === target.id) {
      return { following: false, followsYou: false, isSelf: viewerId === target.id };
    }
    const [out, back] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: target.id } },
        select: { followerId: true },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: target.id, followingId: viewerId } },
        select: { followerId: true },
      }),
    ]);
    return { following: Boolean(out), followsYou: Boolean(back), isSelf: false };
  }

  async followers(username: string): Promise<PresentedUser[]> {
    const target = await this.requireUser(username);
    const rows = await this.prisma.follow.findMany({
      where: { followingId: target.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { follower: { select: { username: true } } },
    });
    return this.presentAll(rows.map((r) => r.follower.username));
  }

  async following(username: string): Promise<PresentedUser[]> {
    const target = await this.requireUser(username);
    const rows = await this.prisma.follow.findMany({
      where: { followerId: target.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { following: { select: { username: true } } },
    });
    return this.presentAll(rows.map((r) => r.following.username));
  }

  private async presentAll(usernames: string[]): Promise<PresentedUser[]> {
    const users = await Promise.all(usernames.map((u) => this.directory.tryGet(u)));
    return users.filter((u): u is PresentedUser => u !== null);
  }

  /** The accounts a viewer follows, for the Following timeline. */
  async followingIds(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    return rows.map((r) => r.followingId);
  }

  async setBookmark(userId: string, postId: string, on: boolean) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new DirectoryError("POST_NOT_FOUND", `No post ${postId} on this instance.`, 404);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.postBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
        select: { id: true },
      });
      if (on && !existing) {
        await tx.postBookmark.create({ data: { userId, postId } });
        await tx.post.update({ where: { id: postId }, data: { bookmarkCount: { increment: 1 } } });
      } else if (!on && existing) {
        await tx.postBookmark.delete({ where: { userId_postId: { userId, postId } } });
        await tx.post.update({ where: { id: postId }, data: { bookmarkCount: { decrement: 1 } } });
      }
    });
    return { bookmarked: on };
  }

  async bookmarkedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const rows = await this.prisma.postBookmark.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    return new Set(rows.map((r) => r.postId));
  }

  async bookmarks(userId: string): Promise<string[]> {
    const rows = await this.prisma.postBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { postId: true },
    });
    return rows.map((r) => r.postId);
  }

  /**
   * Search accounts and posts.
   *
   * Plain case-insensitive substring matching, which is what this size of
   * instance needs and is honest about what it does — no ranking model, in
   * keeping with the rest of the product.
   */
  async searchUsers(query: string): Promise<PresentedUser[]> {
    const q = query.trim();
    if (!q) return [];
    const users = await this.prisma.user.findMany({
      where: {
        status: { not: "DELETED" },
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { username: "asc" },
      take: 25,
      select: { username: true },
    });
    return this.presentAll(users.map((u) => u.username));
  }

  async searchPostIds(query: string): Promise<string[]> {
    const q = query.trim();
    if (!q) return [];
    const posts = await this.prisma.post.findMany({
      where: { deletedAt: null, content: { contains: q, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true },
    });
    return posts.map((p) => p.id);
  }
}
