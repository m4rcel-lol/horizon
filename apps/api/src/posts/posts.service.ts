import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CommunityNotesService, type PresentedNote } from "../notes/community-notes.service";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";
import { UserDirectoryService, type PresentedUser } from "../users/user-directory.service";
import { NotificationsService } from "../social/notifications.service";
import { SocialService } from "../social/social.service";

export interface PresentedPost {
  id: string;
  authorUsername: string;
  content: string;
  createdAt: string;
  /**
   * The author's full public identity, resolved at read time so a timeline
   * renders badges, affiliation and avatar shape without a second request per
   * post — and so a verification change is reflected everywhere at once.
   */
  author: PresentedUser | null;
  /** Notes readers rated helpful. Others never reach the post. */
  notes: PresentedNote[];
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  /** Whether the caller has already liked or reposted, so the buttons can fill in. */
  likedByViewer: boolean;
  repostedByViewer: boolean;
  /** The post this one quotes, embedded one level deep. */
  quoteOf: PresentedPost | null;
  /** Who this is a reply to, for the "Replying to @x" line. */
  replyTo: { id: string; authorUsername: string } | null;
  bookmarkedByViewer: boolean;
  /** Whether the caller may delete it, so the menu only offers what will work. */
  deletableByViewer: boolean;
}

const POST_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  likeCount: true,
  replyCount: true,
  repostCount: true,
  quoteCount: true,
  quoteOfId: true,
  replyToId: true,
  authorId: true,
  author: { select: { username: true } },
} as const;

type PostRow = {
  id: string;
  content: string;
  createdAt: Date;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  quoteOfId: string | null;
  replyToId: string | null;
  authorId: string;
  author: { username: string };
};

/** Posts, stored in Postgres. */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UserDirectoryService,
    private readonly notes: CommunityNotesService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => SocialService))
    private readonly social: SocialService,
  ) {}

  /**
   * @param viewerId the signed-in account, so liked/reposted state is the
   *        caller's own. Null for anonymous readers, who have no state.
   * @param depth guards the quote chain: a quote of a quote renders one level
   *        and stops, rather than walking an arbitrarily long history.
   */
  private async present(
    post: PostRow,
    viewerId: string | null,
    depth = 0,
  ): Promise<PresentedPost> {
    const [author, notes, liked, reposted, bookmarked, quoted, replyParent] = await Promise.all([
      this.directory.tryGet(post.author.username),
      this.notes.forPost(post.id, viewerId),
      viewerId
        ? this.prisma.postLike.findUnique({
            where: { userId_postId: { userId: viewerId, postId: post.id } },
            select: { postId: true },
          })
        : Promise.resolve(null),
      viewerId
        ? this.prisma.postRepost.findUnique({
            where: { userId_postId: { userId: viewerId, postId: post.id } },
            select: { postId: true },
          })
        : Promise.resolve(null),
      viewerId
        ? this.prisma.postBookmark.findUnique({
            where: { userId_postId: { userId: viewerId, postId: post.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
      post.quoteOfId && depth < 1
        ? (this.prisma.post.findFirst({
            where: { id: post.quoteOfId, deletedAt: null },
            select: POST_SELECT,
          }) as Promise<PostRow | null>)
        : Promise.resolve(null),
      post.replyToId
        ? this.prisma.post.findFirst({
            where: { id: post.replyToId },
            select: { id: true, author: { select: { username: true } } },
          })
        : Promise.resolve(null),
    ]);

    return {
      id: post.id,
      authorUsername: post.author.username,
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      author,
      notes,
      likeCount: post.likeCount,
      replyCount: post.replyCount,
      repostCount: post.repostCount,
      quoteCount: post.quoteCount,
      likedByViewer: Boolean(liked),
      repostedByViewer: Boolean(reposted),
      quoteOf: quoted ? await this.present(quoted, viewerId, depth + 1) : null,
      replyTo: replyParent
        ? { id: replyParent.id, authorUsername: replyParent.author.username }
        : null,
      bookmarkedByViewer: Boolean(bookmarked),
      deletableByViewer: viewerId === post.authorId,
    };
  }

  /** The post must exist and not be deleted before anything can point at it. */
  private async requirePost(id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!post) throw new DirectoryError("POST_NOT_FOUND", `No post ${id} on this instance.`, 404);
    return post;
  }

  async create(input: {
    author: string;
    content: string;
    replyToId?: string;
    quoteOfId?: string;
    viewerId?: string | null;
  }): Promise<PresentedPost> {
    // Reject unknown authors rather than storing a dangling handle.
    const author = await this.directory.get(input.author);

    if (input.replyToId && input.quoteOfId) {
      throw new DirectoryError(
        "AMBIGUOUS_POST",
        "A post can reply to something or quote it, not both.",
        400,
      );
    }
    if (input.replyToId) await this.requirePost(input.replyToId);
    if (input.quoteOfId) await this.requirePost(input.quoteOfId);

    // The post and the parent's counter move together: a reply that is not
    // counted, or a count with no reply, are both wrong.
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: author.id,
          content: input.content,
          replyToId: input.replyToId ?? null,
          quoteOfId: input.quoteOfId ?? null,
          type: input.replyToId ? "REPLY" : input.quoteOfId ? "QUOTE" : "ORIGINAL",
        },
        select: POST_SELECT,
      });
      if (input.replyToId) {
        await tx.post.update({
          where: { id: input.replyToId },
          data: { replyCount: { increment: 1 } },
        });
      }
      if (input.quoteOfId) {
        await tx.post.update({
          where: { id: input.quoteOfId },
          data: { quoteCount: { increment: 1 } },
        });
      }
      return created as PostRow;
    });

    // After the post is safely written: a failed notification must not undo it.
    if (input.replyToId) {
      const parent = await this.requirePost(input.replyToId);
      await this.notifications.record({
        recipientId: parent.authorId,
        actorId: author.id,
        type: "REPLY",
        postId: post.id,
      });
    }
    if (input.quoteOfId) {
      const quoted = await this.requirePost(input.quoteOfId);
      await this.notifications.record({
        recipientId: quoted.authorId,
        actorId: author.id,
        type: "QUOTE",
        postId: post.id,
      });
    }
    await this.notifications.recordMentions(input.content, author.id, post.id);

    return this.present(post, input.viewerId ?? author.id);
  }

  /** Posts by id, in the order given — used by bookmarks and search. */
  async byIds(ids: string[], viewerId: string | null = null): Promise<PresentedPost[]> {
    if (ids.length === 0) return [];
    const posts = (await this.prisma.post.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: POST_SELECT,
    })) as PostRow[];
    const byId = new Map(posts.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter((p): p is PostRow => Boolean(p));
    return Promise.all(ordered.map((p) => this.present(p, viewerId)));
  }

  /**
   * The Following timeline: chronological, only accounts the viewer follows.
   *
   * Their own posts are included, because a feed of everyone you follow that
   * silently omits you reads as though your post failed to send.
   */
  async following(viewerId: string): Promise<PresentedPost[]> {
    const ids = await this.social.followingIds(viewerId);
    const posts = (await this.prisma.post.findMany({
      where: { deletedAt: null, replyToId: null, authorId: { in: [...ids, viewerId] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: POST_SELECT,
    })) as PostRow[];
    return Promise.all(posts.map((p) => this.present(p, viewerId)));
  }

  /**
   * Soft delete, by the author or a moderator.
   *
   * The row stays so replies quoting or answering it do not lose their parent
   * key; every read filters on deletedAt.
   */
  async remove(id: string, viewerId: string, canModerate: boolean) {
    const post = await this.requirePost(id);
    if (post.authorId !== viewerId && !canModerate) {
      throw new DirectoryError("NOT_YOUR_POST", "You can only delete your own posts.", 403);
    }
    await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  /**
   * Reverse-chronological, optionally limited to one author.
   *
   * Replies are left out of the timeline: they belong under the post they
   * answer, and mixing them in makes a conversation read as unrelated
   * fragments.
   */
  async list(author?: string, viewerId: string | null = null): Promise<PresentedPost[]> {
    const posts = (await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        replyToId: null,
        ...(author ? { author: { username: author } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: POST_SELECT,
    })) as PostRow[];
    return Promise.all(posts.map((p) => this.present(p, viewerId)));
  }

  async get(id: string, viewerId: string | null = null): Promise<PresentedPost> {
    const post = (await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: POST_SELECT,
    })) as PostRow | null;
    if (!post) throw new DirectoryError("POST_NOT_FOUND", `No post ${id} on this instance.`, 404);
    return this.present(post, viewerId);
  }

  /** Direct replies, oldest first, the way a conversation reads. */
  async replies(id: string, viewerId: string | null = null): Promise<PresentedPost[]> {
    await this.requirePost(id);
    const posts = (await this.prisma.post.findMany({
      where: { replyToId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: POST_SELECT,
    })) as PostRow[];
    return Promise.all(posts.map((p) => this.present(p, viewerId)));
  }

  /** Idempotent per account: liking twice leaves one like, and unlikes cleanly. */
  async setLike(id: string, userId: string, liked: boolean): Promise<PresentedPost> {
    await this.requirePost(id);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.postLike.findUnique({
        where: { userId_postId: { userId, postId: id } },
        select: { postId: true },
      });
      if (liked && !existing) {
        await tx.postLike.create({ data: { userId, postId: id } });
        await tx.post.update({ where: { id }, data: { likeCount: { increment: 1 } } });
      } else if (!liked && existing) {
        await tx.postLike.delete({ where: { userId_postId: { userId, postId: id } } });
        await tx.post.update({ where: { id }, data: { likeCount: { decrement: 1 } } });
      }
    });

    const post = await this.requirePost(id);
    if (liked) {
      await this.notifications.record({
        recipientId: post.authorId,
        actorId: userId,
        type: "LIKE",
        postId: id,
      });
    } else {
      // Un-liking should not leave "x liked your post" sitting in their list.
      await this.notifications.withdraw({
        recipientId: post.authorId,
        actorId: userId,
        type: "LIKE",
        postId: id,
      });
    }
    return this.get(id, userId);
  }

  async setRepost(id: string, userId: string, reposted: boolean): Promise<PresentedPost> {
    await this.requirePost(id);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.postRepost.findUnique({
        where: { userId_postId: { userId, postId: id } },
        select: { postId: true },
      });
      if (reposted && !existing) {
        await tx.postRepost.create({ data: { userId, postId: id } });
        await tx.post.update({ where: { id }, data: { repostCount: { increment: 1 } } });
      } else if (!reposted && existing) {
        await tx.postRepost.delete({ where: { userId_postId: { userId, postId: id } } });
        await tx.post.update({ where: { id }, data: { repostCount: { decrement: 1 } } });
      }
    });

    const post = await this.requirePost(id);
    if (reposted) {
      await this.notifications.record({
        recipientId: post.authorId,
        actorId: userId,
        type: "REPOST",
        postId: id,
      });
    } else {
      await this.notifications.withdraw({
        recipientId: post.authorId,
        actorId: userId,
        type: "REPOST",
        postId: id,
      });
    }
    return this.get(id, userId);
  }
}
