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
      select: { id: true, username: true, isSystem: true, isProtected: true },
    });
    if (!user) {
      throw new DirectoryError("USER_NOT_FOUND", `No account @${username} on this instance.`, 404);
    }
    return user;
  }

  /**
   * Follow, ask to follow, or unfollow.
   *
   * Sending the state you want rather than toggling, so a retried request
   * cannot land you on the opposite of what you asked for.
   *
   * A private account turns the follow into a request. Nothing about the
   * follower's view changes until it is approved: no Follow row exists, so
   * every query that reads follows still excludes them.
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
      // A blocked account may not follow the account that blocked it. Checked
      // before the protected-account branch so a block cannot be turned into a
      // pending request that sits in the blocker's approval list.
      await this.assertNotBlockedBy(followerId, target.id);
      if (target.isProtected) {
        const alreadyAsked = await this.prisma.followRequest.findUnique({
          where: { requesterId_targetId: { requesterId: followerId, targetId: target.id } },
          select: { requesterId: true },
        });
        if (!alreadyAsked) {
          await this.prisma.followRequest.create({
            data: { requesterId: followerId, targetId: target.id },
          });
          await this.notifications.record({
            recipientId: target.id,
            actorId: followerId,
            type: "FOLLOW_REQUEST",
          });
        }
        return { user: await this.directory.get(username), following: false, requested: true };
      }
      await this.prisma.follow.create({ data: { followerId, followingId: target.id } });
      await this.notifications.record({
        recipientId: target.id,
        actorId: followerId,
        type: "FOLLOW",
      });
    } else if (!following) {
      if (existing) {
        await this.prisma.follow.delete({
          where: { followerId_followingId: { followerId, followingId: target.id } },
        });
        await this.notifications.withdraw({
          recipientId: target.id,
          actorId: followerId,
          type: "FOLLOW",
        });
      }
      // Unfollowing also withdraws a request that was never answered —
      // otherwise pressing the button again would look like nothing happened.
      await this.prisma.followRequest.deleteMany({
        where: { requesterId: followerId, targetId: target.id },
      });
      await this.notifications.withdraw({
        recipientId: target.id,
        actorId: followerId,
        type: "FOLLOW_REQUEST",
      });
    }

    return { user: await this.directory.get(username), following, requested: false };
  }

  /**
   * Block or unblock an account.
   *
   * Blocking here means: they may not follow you, and they may not act on
   * anything you post. It deliberately does not hide your posts — that is the
   * shape this instance chose, and it is the reason `hiddenAuthorIds` (which
   * is about private accounts) has nothing to do with blocks.
   *
   * Any follow between the two is dropped in both directions. Leaving one in
   * place would keep the blocked account reading the blocker in their Following
   * feed, which is the one thing a block has to stop.
   */
  async setBlock(blockerId: string, username: string, on: boolean) {
    const target = await this.requireUser(username);
    if (target.id === blockerId) {
      throw new DirectoryError("CANNOT_BLOCK_SELF", "You cannot block yourself.", 400);
    }
    if (target.isSystem) {
      throw new DirectoryError("CANNOT_BLOCK_SYSTEM", "System accounts cannot be blocked.", 400);
    }

    if (on) {
      await this.prisma.$transaction(async (tx) => {
        await tx.block.upsert({
          where: { blockerId_blockedId: { blockerId, blockedId: target.id } },
          create: { blockerId, blockedId: target.id },
          update: {},
        });
        await tx.follow.deleteMany({
          where: {
            OR: [
              { followerId: target.id, followingId: blockerId },
              { followerId: blockerId, followingId: target.id },
            ],
          },
        });
        await tx.followRequest.deleteMany({
          where: {
            OR: [
              { requesterId: target.id, targetId: blockerId },
              { requesterId: blockerId, targetId: target.id },
            ],
          },
        });
        // A block is not an event the blocked account is told about, so the
        // follow notification it leaves behind should not survive either.
        await tx.notification.deleteMany({
          where: {
            OR: [
              { recipientId: blockerId, actorId: target.id, type: { in: ["FOLLOW", "FOLLOW_REQUEST"] } },
              { recipientId: target.id, actorId: blockerId, type: { in: ["FOLLOW", "FOLLOW_REQUEST"] } },
            ],
          },
        });
      });
    } else {
      await this.prisma.block.deleteMany({ where: { blockerId, blockedId: target.id } });
    }

    return { user: await this.directory.get(username), blocked: on };
  }

  /** Accounts this user has blocked. */
  async blocks(userId: string): Promise<PresentedUser[]> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { blocked: { select: { username: true } } },
    });
    return this.presentAll(rows.map((r) => r.blocked.username));
  }

  /** Has `blockerId` blocked `blockedId`? */
  async isBlockedBy(blockedId: string, blockerId: string): Promise<boolean> {
    const row = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      select: { blockerId: true },
    });
    return Boolean(row);
  }

  /**
   * Refuse an interaction the blocked account is not allowed to make.
   *
   * Called by every write that acts on someone else's post or account, so the
   * rule lives in one place rather than being restated at each call site.
   */
  async assertNotBlockedBy(actorId: string, ownerId: string) {
    if (actorId === ownerId) return;
    if (await this.isBlockedBy(actorId, ownerId)) {
      throw new DirectoryError("BLOCKED", "You cannot interact with this account.", 403);
    }
  }

  /** Pending requests to follow you, for the approval list. */
  async followRequests(userId: string): Promise<PresentedUser[]> {
    const rows = await this.prisma.followRequest.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { requester: { select: { username: true } } },
    });
    return this.presentAll(rows.map((r) => r.requester.username));
  }

  /**
   * Approve or decline someone waiting to follow you.
   *
   * Approving is what creates the Follow row — until then the requester has
   * seen nothing they could not have seen as a stranger.
   */
  async resolveFollowRequest(userId: string, requesterUsername: string, approve: boolean) {
    const requester = await this.requireUser(requesterUsername);
    const pending = await this.prisma.followRequest.findUnique({
      where: { requesterId_targetId: { requesterId: requester.id, targetId: userId } },
      select: { requesterId: true },
    });
    if (!pending) {
      throw new DirectoryError("REQUEST_NOT_FOUND", "That follow request is no longer pending.", 404);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.followRequest.delete({
        where: { requesterId_targetId: { requesterId: requester.id, targetId: userId } },
      });
      if (approve) {
        await tx.follow.upsert({
          where: { followerId_followingId: { followerId: requester.id, followingId: userId } },
          create: { followerId: requester.id, followingId: userId },
          update: {},
        });
      }
      // The ask has been answered either way, so it stops sitting in the
      // recipient's notifications as though it were still open.
      await tx.notification.deleteMany({
        where: { recipientId: userId, actorId: requester.id, type: "FOLLOW_REQUEST" },
      });
      if (approve) {
        await tx.notification.create({
          data: {
            recipientId: requester.id,
            actorId: userId,
            type: "FOLLOW",
            data: { kind: "FOLLOW_APPROVED" },
          },
        });
      }
    });

    return { ok: true as const, approved: approve };
  }

  /** Does the caller follow this account, does it follow them back, and may they see it? */
  async relationship(viewerId: string | null, username: string) {
    const target = await this.requireUser(username);
    if (viewerId === target.id) {
      return {
        following: false,
        followsYou: false,
        isSelf: true,
        requested: false,
        canViewPosts: true,
        blocking: false,
        blockedBy: false,
      };
    }
    if (!viewerId) {
      return {
        following: false,
        followsYou: false,
        isSelf: false,
        requested: false,
        canViewPosts: !target.isProtected,
        blocking: false,
        blockedBy: false,
      };
    }
    const [out, back, pending, blocking, blockedBy] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: target.id } },
        select: { followerId: true },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: target.id, followingId: viewerId } },
        select: { followerId: true },
      }),
      this.prisma.followRequest.findUnique({
        where: { requesterId_targetId: { requesterId: viewerId, targetId: target.id } },
        select: { requesterId: true },
      }),
      this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: viewerId, blockedId: target.id } },
        select: { blockerId: true },
      }),
      this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: target.id, blockedId: viewerId } },
        select: { blockerId: true },
      }),
    ]);
    return {
      following: Boolean(out),
      followsYou: Boolean(back),
      isSelf: false,
      requested: Boolean(pending),
      canViewPosts: !target.isProtected || Boolean(out),
      /** The caller has blocked them. */
      blocking: Boolean(blocking),
      /**
       * They have blocked the caller. Sent so the interface can disable the
       * controls up front instead of letting every button fail with a 403.
       */
      blockedBy: Boolean(blockedBy),
    };
  }

  /**
   * Accounts whose top-level posts this viewer must not be shown: private
   * accounts they do not follow.
   *
   * One query, resolved once per listing rather than per post, and returned as
   * a list of ids so callers can drop it straight into a `notIn`. Replies are
   * deliberately not covered — a private account's replies stay visible, so a
   * thread does not turn into holes for everyone else reading it.
   */
  async hiddenAuthorIds(viewerId: string | null): Promise<string[]> {
    const protectedUsers = await this.prisma.user.findMany({
      where: { isProtected: true, status: { not: "DELETED" } },
      select: { id: true },
    });
    if (protectedUsers.length === 0) return [];
    if (!viewerId) return protectedUsers.map((u) => u.id);

    const visible = await this.prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: protectedUsers.map((u) => u.id) } },
      select: { followingId: true },
    });
    const allowed = new Set([...visible.map((f) => f.followingId), viewerId]);
    return protectedUsers.map((u) => u.id).filter((id) => !allowed.has(id));
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
