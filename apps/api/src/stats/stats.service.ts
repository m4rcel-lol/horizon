import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";

/** Counts for one day, for the small bar charts. */
export interface DailyPoint {
  date: string;
  posts: number;
}

export interface InstanceStats {
  accounts: { total: number; active: number; suspended: number; verified: number; system: number };
  posts: { total: number; original: number; replies: number; quotes: number; deleted: number };
  engagement: { likes: number; reposts: number; bookmarks: number; follows: number };
  notes: { total: number; helpful: number; notHelpful: number; pending: number };
  communities: { total: number; members: number };
  /** New accounts and posts in the last 7 days. */
  recent: { accounts: number; posts: number };
  daily: DailyPoint[];
}

export interface UserStats {
  username: string;
  posts: { total: number; original: number; replies: number; quotes: number };
  received: { likes: number; reposts: number; replies: number };
  given: { likes: number; reposts: number };
  audience: { followers: number; following: number };
  joinedAt: string;
  daily: DailyPoint[];
}

/**
 * Counts, computed on demand.
 *
 * Aggregate queries rather than a stored rollup: an instance this size answers
 * them in milliseconds, and a rollup is a second source of truth that can
 * drift from the rows it summarises. If it ever gets slow, that is the moment
 * to cache — not before.
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Posts per day for the last `days` days, zero-filled so gaps are visible. */
  private async dailyPosts(days: number, authorId?: string): Promise<DailyPoint[]> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const rows = await this.prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gte: since }, ...(authorId ? { authorId } : {}) },
      select: { createdAt: true },
    });

    const counts = new Map<string, number>();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      counts.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([date, posts]) => ({ date, posts }));
  }

  async instance(): Promise<InstanceStats> {
    const weekAgo = new Date(Date.now() - 7 * 86400_000);

    const [
      total, suspended, verified, system,
      posts, replies, quotes, deleted,
      likes, reposts, bookmarks, follows,
      helpful, notHelpful, pendingNotes,
      communities, members,
      newAccounts, newPosts,
      daily,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: "SUSPENDED" } }),
      this.prisma.user.count({ where: { verification: { not: "NONE" } } }),
      this.prisma.user.count({ where: { isSystem: true } }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.post.count({ where: { deletedAt: null, replyToId: { not: null } } }),
      this.prisma.post.count({ where: { deletedAt: null, quoteOfId: { not: null } } }),
      this.prisma.post.count({ where: { deletedAt: { not: null } } }),
      this.prisma.postLike.count(),
      this.prisma.postRepost.count(),
      this.prisma.postBookmark.count(),
      this.prisma.follow.count(),
      this.prisma.communityNote.count({ where: { status: "HELPFUL" } }),
      this.prisma.communityNote.count({ where: { status: "NOT_HELPFUL" } }),
      this.prisma.communityNote.count({ where: { status: "NEEDS_MORE_RATINGS" } }),
      this.prisma.community.count(),
      this.prisma.communityMember.count(),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.post.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
      this.dailyPosts(14),
    ]);

    return {
      accounts: { total, active: total - suspended, suspended, verified, system },
      posts: { total, original: posts - replies - quotes, replies, quotes, deleted },
      engagement: { likes, reposts, bookmarks, follows },
      notes: { total: helpful + notHelpful + pendingNotes, helpful, notHelpful, pending: pendingNotes },
      communities: { total: communities, members },
      recent: { accounts: newAccounts, posts: newPosts },
      daily,
    };
  }

  async forUser(username: string): Promise<UserStats> {
    const user = await this.prisma.user.findFirst({
      where: { username, status: { not: "DELETED" } },
      select: { id: true, username: true, createdAt: true },
    });
    if (!user) {
      throw new DirectoryError("USER_NOT_FOUND", `No account @${username} on this instance.`, 404);
    }

    const [
      total, replies, quotes,
      likesReceived, repostsReceived, repliesReceived,
      likesGiven, repostsGiven,
      followers, following,
      daily,
    ] = await Promise.all([
      this.prisma.post.count({ where: { authorId: user.id, deletedAt: null } }),
      this.prisma.post.count({ where: { authorId: user.id, deletedAt: null, replyToId: { not: null } } }),
      this.prisma.post.count({ where: { authorId: user.id, deletedAt: null, quoteOfId: { not: null } } }),
      this.prisma.postLike.count({ where: { post: { authorId: user.id, deletedAt: null } } }),
      this.prisma.postRepost.count({ where: { post: { authorId: user.id, deletedAt: null } } }),
      this.prisma.post.count({
        where: { deletedAt: null, replyTo: { authorId: user.id } },
      }),
      this.prisma.postLike.count({ where: { userId: user.id } }),
      this.prisma.postRepost.count({ where: { userId: user.id } }),
      this.prisma.follow.count({ where: { followingId: user.id } }),
      this.prisma.follow.count({ where: { followerId: user.id } }),
      this.dailyPosts(14, user.id),
    ]);

    return {
      username: user.username,
      posts: { total, original: total - replies - quotes, replies, quotes },
      received: { likes: likesReceived, reposts: repostsReceived, replies: repliesReceived },
      given: { likes: likesGiven, reposts: repostsGiven },
      audience: { followers, following },
      joinedAt: user.createdAt.toISOString(),
      daily,
    };
  }
}
