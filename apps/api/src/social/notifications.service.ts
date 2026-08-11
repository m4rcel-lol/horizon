import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UserDirectoryService, type PresentedUser } from "../users/user-directory.service";

/**
 * Every member of the database's NotificationType.
 *
 * This list must stay exhaustive. It is what `list()` casts rows to, so a type
 * missing here is not a compile error — it is a row arriving at a client with
 * no case for it, which is how a join request came to render as "did
 * something".
 */
export type NotificationKind =
  | "LIKE"
  | "REPLY"
  | "REPOST"
  | "QUOTE"
  | "MENTION"
  | "FOLLOW"
  | "FOLLOW_REQUEST"
  | "DM"
  | "COMMUNITY"
  | "MODERATION"
  | "SYSTEM";

/**
 * What a notification is about, within its type.
 *
 * COMMUNITY covers both "someone asked to join" and "your request was
 * accepted", and the two read nothing alike, so the type alone is not enough
 * to write the sentence.
 */
export type NotificationDetail =
  | "FOLLOW_APPROVED"
  | "JOIN_REQUEST"
  | "JOIN_APPROVED"
  | "AUTOMATION_REQUEST"
  | "AUTOMATION_ACCEPTED"
  | "AUTOMATION_DECLINED";

export interface PresentedNotification {
  id: string;
  type: NotificationKind;
  /** Discriminates within the type. Null when the type says it all. */
  kind: NotificationDetail | null;
  actor: PresentedUser | null;
  postId: string | null;
  communityId: string | null;
  /** Named, so a row can say which community without a second request. */
  community: { slug: string; name: string } | null;
  /** Deep-link path when the notification should open a specific page. */
  href: string | null;
  /** A short excerpt, so the row says something without loading the post. */
  excerpt: string | null;
  read: boolean;
  createdAt: string;
}

/**
 * Notifications.
 *
 * Written on the actions that cause them, rather than derived by scanning for
 * things that happened — a read of "what is new for me" has to be one indexed
 * query, and derivation cannot represent "seen".
 *
 * Recording one must never break the action that caused it: a failure here is
 * logged and swallowed, because a like that half-succeeded is worse than a
 * missing notification.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UserDirectoryService,
  ) {}

  async record(input: {
    recipientId: string;
    actorId: string;
    type: NotificationKind;
    postId?: string | null;
  }) {
    // Your own actions are not news to you.
    if (input.recipientId === input.actorId) return;
    try {
      await this.prisma.notification.create({
        data: {
          recipientId: input.recipientId,
          actorId: input.actorId,
          type: input.type,
          postId: input.postId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Could not record a ${input.type} notification: ${error}`);
    }
  }

  /** Undo the notification an un-like, un-repost or unfollow leaves behind. */
  async withdraw(input: {
    recipientId: string;
    actorId: string;
    type: NotificationKind;
    /** Omitted for notifications with no post, such as a follow. */
    postId?: string | null;
  }) {
    try {
      await this.prisma.notification.deleteMany({
        where: {
          recipientId: input.recipientId,
          actorId: input.actorId,
          type: input.type,
          postId: input.postId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Could not withdraw a ${input.type} notification: ${error}`);
    }
  }

  /** @mentions in a post body, resolved to accounts that exist. */
  async recordMentions(body: string, actorId: string, postId: string) {
    const handles = [...new Set([...body.matchAll(/@([a-zA-Z0-9_]{3,20})/g)].map((m) => m[1]))];
    if (handles.length === 0) return;
    const users = await this.prisma.user.findMany({
      where: { username: { in: handles }, status: { not: "DELETED" } },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => this.record({ recipientId: u.id, actorId, type: "MENTION", postId })),
    );
  }

  async list(
    userId: string,
    filter: "all" | "mentions" = "all",
  ): Promise<PresentedNotification[]> {
    const rows = await this.prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(filter === "mentions" ? { type: { in: ["MENTION", "REPLY", "QUOTE"] } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // One lookup per distinct actor and post, not per row.
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean) as string[])];
    const postIds = [...new Set(rows.map((r) => r.postId).filter(Boolean) as string[])];
    const [actors, posts] = await Promise.all([
      actorIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { username: true, id: true },
          })
        : Promise.resolve([]),
      postIds.length
        ? this.prisma.post.findMany({
            where: { id: { in: postIds } },
            select: { id: true, content: true, author: { select: { username: true } } },
          })
        : Promise.resolve([]),
    ]);

    const presentedActors = new Map<string, PresentedUser | null>();
    await Promise.all(
      actors.map(async (a) => presentedActors.set(a.id, await this.directory.tryGet(a.username))),
    );
    const excerpts = new Map(posts.map((p) => [p.id, p.content.slice(0, 140)]));
    // Permalinks are built here because the post's author is the one who owns
    // the URL, and that is rarely the actor: on a like or a repost the post is
    // the recipient's, so a link assembled from the actor points at a handle
    // that has nothing to do with the post.
    const permalinks = new Map(
      posts.map((p) => [p.id, `/${p.author.username}/status/${p.id}`]),
    );

    return rows.map((row) => {
      const data = (row.data ?? {}) as {
        kind?: NotificationDetail;
        communitySlug?: string;
        communityName?: string;
        requestId?: string;
      };
      const kind = data.kind ?? null;
      const community =
        data.communitySlug && data.communityName
          ? { slug: data.communitySlug, name: data.communityName }
          : null;

      // Where the row goes when tapped. The sentence itself stays the client's
      // business: it renders names and badges as elements, which a string
      // assembled here could not carry.
      let href: string | null = row.postId ? permalinks.get(row.postId) ?? null : null;
      if (kind === "JOIN_REQUEST" && community) {
        href = `/communities/${community.slug}/requests`;
      } else if (kind === "JOIN_APPROVED" && community) {
        href = `/communities/${community.slug}`;
      } else if (kind?.startsWith("AUTOMATION_")) {
        href = "/settings";
      }

      return {
        id: row.id,
        type: row.type as NotificationKind,
        kind,
        actor: row.actorId ? presentedActors.get(row.actorId) ?? null : null,
        postId: row.postId,
        communityId: row.communityId ?? null,
        community,
        href,
        excerpt: row.postId ? excerpts.get(row.postId) ?? null : null,
        read: row.readAt !== null,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { recipientId: userId, readAt: null } });
  }

  async markAllRead(userId: string): Promise<{ read: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: count };
  }
}
