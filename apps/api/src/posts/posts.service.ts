import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CommunityNotesService, type PresentedNote } from "../notes/community-notes.service";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";
import { UserDirectoryService, type PresentedUser } from "../users/user-directory.service";
import { NotificationsService } from "../social/notifications.service";
import { SocialService } from "../social/social.service";
import { MediaService } from "../media/media.service";

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
  media: { id: string; url: string; mimeType: string; type: "IMAGE" | "GIF"; altText: string | null }[];
  poll: PresentedPoll | null;
  /**
   * Set when this row appears because someone reposted it, rather than wrote
   * it. The card shows "@x reposted" above the original author.
   */
  repostedBy: { username: string; displayName: string } | null;
  /**
   * The author has blocked the caller, so every action on this post would be
   * refused. Sent per post so a card can disable its own buttons rather than
   * letting each one fail with a 403 after the click.
   */
  blockedByAuthor: boolean;
  /**
   * The community it was posted into, for the "from <community>" footer.
   *
   * The join table allows a post in several communities, but composing only
   * ever files it under one, so the card shows the first and the shape stays
   * a single value rather than a list nothing renders.
   */
  community: { slug: string; name: string; avatarUrl: string | null } | null;
}

export interface PresentedPoll {
  id: string;
  expiresAt: string;
  closed: boolean;
  totalVotes: number;
  /** Which option the caller chose, so their own vote is marked. */
  votedOptionId: string | null;
  options: { id: string; text: string; voteCount: number; share: number }[];
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
  media: { orderBy: { position: "asc" }, select: { mediaId: true } },
  poll: {
    select: {
      id: true,
      expiresAt: true,
      options: { orderBy: { position: "asc" }, select: { id: true, text: true, voteCount: true } },
    },
  },
  communityPosts: {
    take: 1,
    orderBy: { createdAt: "asc" },
    select: { community: { select: { slug: true, name: true, avatarUrl: true } } },
  },
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
  media: { mediaId: string }[];
  poll: {
    id: string;
    expiresAt: Date;
    options: { id: string; text: string; voteCount: number }[];
  } | null;
  communityPosts: { community: { slug: string; name: string; avatarUrl: string | null } }[];
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
    private readonly mediaService: MediaService,
  ) {}

  /**
   * A poll with its shares worked out.
   *
   * Percentages are computed here rather than in the client so every surface
   * that renders a poll agrees, and so a poll with no votes reads as 0% rather
   * than NaN.
   */
  private async presentPoll(
    poll: NonNullable<PostRow["poll"]>,
    viewerId: string | null,
  ): Promise<PresentedPoll> {
    const total = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
    const vote = viewerId
      ? await this.prisma.pollVote.findUnique({
          where: { pollId_userId: { pollId: poll.id, userId: viewerId } },
          select: { optionId: true },
        })
      : null;
    return {
      id: poll.id,
      expiresAt: poll.expiresAt.toISOString(),
      closed: poll.expiresAt.getTime() <= Date.now(),
      totalVotes: total,
      votedOptionId: vote?.optionId ?? null,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o.voteCount,
        share: total === 0 ? 0 : Math.round((o.voteCount / total) * 100),
      })),
    };
  }

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
    /** The post's own page shows notes still gathering ratings; timelines do not. */
    includePendingNotes = false,
  ): Promise<PresentedPost> {
    const [author, notes, liked, reposted, bookmarked, quoted, replyParent, blocked] = await Promise.all([
      this.directory.tryGet(post.author.username),
      // Only the post's own page carries unrated notes. Broadcasting them to
      // every timeline would publish anything anyone writes to all readers,
      // which is the gate Community Notes exists to impose.
      this.notes.forPost(post.id, viewerId, { includePending: includePendingNotes }),
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
      viewerId && viewerId !== post.authorId
        ? this.prisma.block.findUnique({
            where: {
              blockerId_blockedId: { blockerId: post.authorId, blockedId: viewerId },
            },
            select: { blockerId: true },
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
      // Whether *this* reader may delete it. A moderator can delete anything,
      // but does so from the admin panel, which is where the reason that has
      // to accompany it belongs — so this stays about the author.
      deletableByViewer: viewerId === post.authorId,
      media: await this.mediaService.describe(post.media.map((m) => m.mediaId)),
      poll: post.poll ? await this.presentPoll(post.poll, viewerId) : null,
      repostedBy: null,
      blockedByAuthor: Boolean(blocked),
      community: post.communityPosts[0]?.community ?? null,
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
    mediaIds?: string[];
    poll?: { options: string[]; durationMinutes: number };
    viewerId?: string | null;
    visibility?: "PUBLIC" | "FOLLOWERS" | "MENTIONED" | "PRIVATE";
    communitySlug?: string;
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
    // Replying to and quoting a post are both interactions with its author, so
    // a block stops them the same way it stops a like.
    if (input.replyToId) {
      const parent = await this.requirePost(input.replyToId);
      await this.social.assertNotBlockedBy(author.id, parent.authorId);
    }
    if (input.quoteOfId) {
      const quoted = await this.requirePost(input.quoteOfId);
      await this.social.assertNotBlockedBy(author.id, quoted.authorId);
    }

    const mediaIds = input.mediaIds ?? [];
    // Attaching someone else's upload would let one account put another's
    // image on their post, so ownership is checked before anything is written.
    await this.mediaService.assertOwned(mediaIds, author.id);

    if (input.poll && mediaIds.length > 0) {
      throw new DirectoryError(
        "POLL_WITH_MEDIA",
        "A post can carry images or a poll, not both.",
        400,
      );
    }
    if (input.poll) {
      const options = input.poll.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2 || options.length > 4) {
        throw new DirectoryError("POLL_OPTIONS", "A poll needs between two and four choices.", 400);
      }
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
        throw new DirectoryError("POLL_DUPLICATE", "Poll choices must be different.", 400);
      }
      input.poll = { ...input.poll, options };
    }

    // The post and the parent's counter move together: a reply that is not
    // counted, or a count with no reply, are both wrong.
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: author.id,
          content: input.content,
          replyToId: input.replyToId ?? null,
          quoteOfId: input.quoteOfId ?? null,
          visibility: input.visibility ?? "PUBLIC",
          type: input.replyToId ? "REPLY" : input.quoteOfId ? "QUOTE" : "ORIGINAL",
        },
        select: POST_SELECT,
      });

      if (input.communitySlug) {
        const community = await tx.community.findUnique({
          where: { slug: input.communitySlug },
          select: { id: true },
        });
        if (community) {
          const member = await tx.communityMember.findUnique({
            where: {
              communityId_userId: { communityId: community.id, userId: author.id },
            },
            select: { userId: true },
          });
          if (member) {
            await tx.communityPost.create({
              data: { communityId: community.id, postId: created.id },
            });
            await tx.community.update({
              where: { id: community.id },
              data: { postCount: { increment: 1 } },
            });
          }
        }
      }

      for (const [position, mediaId] of mediaIds.entries()) {
        await tx.postMedia.create({ data: { postId: created.id, mediaId, position } });
      }

      if (input.poll) {
        await tx.poll.create({
          data: {
            postId: created.id,
            expiresAt: new Date(Date.now() + input.poll.durationMinutes * 60_000),
            options: {
              create: input.poll.options.map((text, position) => ({ text, position })),
            },
          },
        });
      }

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
      // Re-read after the attachments and poll are written: the row selected
      // at creation predates them and would render an empty post.
      return (await tx.post.findUniqueOrThrow({
        where: { id: created.id },
        select: POST_SELECT,
      })) as PostRow;
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

  /**
   * Posts a viewer must not be shown, as a Prisma filter.
   *
   * The rule is top-level posts only: a private account's replies stay
   * readable, so a thread does not turn into holes for everyone else in it.
   * Written once here because four separate read paths need exactly this.
   */
  private audienceFilter(hidden: string[], suspended: string[] = []) {
    const clauses: object[] = [];
    if (hidden.length) {
      clauses.push({ NOT: { AND: [{ authorId: { in: hidden } }, { replyToId: null }] } });
    }
    // A suspension takes everything with it, replies included, for every
    // reader — otherwise a profile reading "suspended" sits above posts by
    // that account still circulating everywhere else.
    if (suspended.length) clauses.push({ authorId: { notIn: suspended } });
    return clauses.length ? { AND: clauses } : {};
  }

  /** Posts by id, in the order given — used by bookmarks, search and communities. */
  async byIds(ids: string[], viewerId: string | null = null): Promise<PresentedPost[]> {
    if (ids.length === 0) return [];
    const [hidden, suspended] = await Promise.all([
      this.social.hiddenAuthorIds(viewerId),
      this.social.suspendedAuthorIds(),
    ]);
    const posts = (await this.prisma.post.findMany({
      where: { id: { in: ids }, deletedAt: null, ...this.audienceFilter(hidden, suspended) },
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
    const [ids, suspended] = await Promise.all([
      this.social.followingIds(viewerId),
      this.social.suspendedAuthorIds(),
    ]);
    // Following someone who is later suspended should not keep them in the
    // feed; the follow survives the suspension, the posts do not.
    const banned = new Set(suspended);
    const visible = [...ids, viewerId].filter((id) => !banned.has(id));
    const posts = (await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        replyToId: null,
        authorId: { in: visible },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: POST_SELECT,
    })) as PostRow[];
    return Promise.all(posts.map((p) => this.present(p, viewerId)));
  }

  /**
   * Vote in a poll.
   *
   * One vote per account, changeable while the poll is open — the option
   * counters move with the vote row in one transaction so a tally can never
   * disagree with the votes behind it.
   */
  async votePoll(postId: string, optionId: string, userId: string): Promise<PresentedPost> {
    const option = await this.prisma.pollOption.findUnique({
      where: { id: optionId },
      select: { id: true, pollId: true, poll: { select: { postId: true, expiresAt: true } } },
    });
    if (!option || option.poll.postId !== postId) {
      throw new DirectoryError("OPTION_NOT_FOUND", "That choice is not on this poll.", 404);
    }
    if (option.poll.expiresAt.getTime() <= Date.now()) {
      throw new DirectoryError("POLL_CLOSED", "This poll has closed.", 409);
    }
    // Voting moves a number on someone else's post, so it is an interaction.
    const owner = await this.requirePost(postId);
    await this.social.assertNotBlockedBy(userId, owner.authorId);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.pollVote.findUnique({
        where: { pollId_userId: { pollId: option.pollId, userId } },
        select: { id: true, optionId: true },
      });
      if (existing?.optionId === optionId) return;

      if (existing) {
        await tx.pollOption.update({
          where: { id: existing.optionId },
          data: { voteCount: { decrement: 1 } },
        });
        await tx.pollVote.update({ where: { id: existing.id }, data: { optionId } });
      } else {
        await tx.pollVote.create({ data: { pollId: option.pollId, optionId, userId } });
      }
      await tx.pollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
    });

    return this.get(postId, userId);
  }

  /**
   * Soft delete, by the author or a moderator.
   *
   * The row stays so replies quoting or answering it do not lose their parent
   * key; every read filters on deletedAt.
   */
  async remove(id: string, viewerId: string, canModerate: boolean, reason?: string) {
    const post = await this.requirePost(id);
    const isOwn = post.authorId === viewerId;
    if (!isOwn && !canModerate) {
      throw new DirectoryError("NOT_YOUR_POST", "You can only delete your own posts.", 403);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({ where: { id }, data: { deletedAt: new Date() } });
      // Someone deleting their own post is not moderation and needs no record.
      // A moderator reaching into another account's posts is, and the instance
      // should be able to say afterwards who removed what and why.
      if (!isOwn) {
        await tx.moderationAction.create({
          data: {
            targetUserId: post.authorId,
            targetPostId: id,
            actorId: viewerId,
            action: "delete_post",
            reason: reason?.trim() || null,
          },
        });
      }
    });
    return { deleted: true };
  }

  /**
   * Posts as a moderator needs to find them: by text, by author, newest first.
   *
   * Deleted posts are included and flagged, because "did someone already remove
   * this" is exactly the question being asked when a report comes in twice.
   */
  async moderationSearch(input: { query?: string; author?: string; page?: number }) {
    const perPage = 25;
    const page = Math.max(input.page ?? 1, 1);
    const query = (input.query ?? "").trim();
    const author = (input.author ?? "").trim();

    const where = {
      ...(query ? { content: { contains: query, mode: "insensitive" as const } } : {}),
      ...(author ? { author: { username: author } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          content: true,
          createdAt: true,
          deletedAt: true,
          likeCount: true,
          replyCount: true,
          repostCount: true,
          author: { select: { username: true, displayName: true, avatarUrl: true, status: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts: rows.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        deleted: r.deletedAt !== null,
        likeCount: r.likeCount,
        replyCount: r.replyCount,
        repostCount: r.repostCount,
        author: {
          username: r.author.username,
          displayName: r.author.displayName,
          avatarUrl: r.author.avatarUrl,
          suspended: r.author.status === "SUSPENDED",
        },
      })),
      total,
      page,
      perPage,
    };
  }

  /**
   * Reverse-chronological, optionally limited to one author.
   *
   * Replies are left out of the timeline: they belong under the post they
   * answer, and mixing them in makes a conversation read as unrelated
   * fragments.
   */
  async list(author?: string, viewerId: string | null = null): Promise<PresentedPost[]> {
    // Private accounts keep their timeline to approved followers. This is the
    // listing both the public feed and a profile page come through, so the
    // filter belongs here rather than at either call site.
    const [hidden, suspended] = await Promise.all([
      this.social.hiddenAuthorIds(viewerId),
      this.social.suspendedAuthorIds(),
    ]);
    const invisible = [...new Set([...hidden, ...suspended])];

    const posts = (await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        replyToId: null,
        ...(author ? { author: { username: author } } : {}),
        ...(invisible.length ? { authorId: { notIn: invisible } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: POST_SELECT,
    })) as PostRow[];

    const presented = await Promise.all(posts.map((p) => this.present(p, viewerId)));
    if (!author) return presented;

    // On a profile, a repost is something the account did, so it belongs on
    // their timeline — placed by when they reposted it, not when it was
    // written, which is the order the visitor is reading in.
    const reposts = await this.prisma.postRepost.findMany({
      where: {
        // The second clause withholds a private account's own reposts:
        // otherwise their profile would be empty of posts but still full of
        // everything they had reposted.
        user: { username: author, ...(invisible.length ? { id: { notIn: invisible } } : {}) },
        post: {
          deletedAt: null,
          // A repost carries the original post's audience with it, so
          // reposting cannot surface a private account's post to people that
          // account has not approved, nor keep a suspended account in
          // circulation through someone else's profile.
          ...(invisible.length ? { authorId: { notIn: invisible } } : {}),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        createdAt: true,
        user: { select: { username: true, displayName: true } },
        post: { select: POST_SELECT },
      },
    });

    const reposted = await Promise.all(
      reposts.map(async (r) => ({
        at: r.createdAt.getTime(),
        post: {
          ...(await this.present(r.post as PostRow, viewerId)),
          repostedBy: { username: r.user.username, displayName: r.user.displayName },
        },
      })),
    );

    // Their own post that they also reposted would otherwise appear twice.
    const own = new Set(presented.map((p) => p.id));
    const merged = [
      ...presented.map((p) => ({ at: new Date(p.createdAt).getTime(), post: p })),
      ...reposted.filter((r) => !own.has(r.post.id)),
    ];
    merged.sort((a, b) => b.at - a.at);
    return merged.slice(0, 100).map((m) => m.post);
  }

  /**
   * One post in full.
   *
   * `withPendingNotes` is what the post's own page asks for: a note still
   * gathering ratings has to be visible somewhere a reader can rate it, and
   * this is that place.
   */
  async get(
    id: string,
    viewerId: string | null = null,
    withPendingNotes = false,
  ): Promise<PresentedPost> {
    const post = (await this.prisma.post.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.audienceFilter(
          await this.social.hiddenAuthorIds(viewerId),
          await this.social.suspendedAuthorIds(),
        ),
      },
      select: POST_SELECT,
    })) as PostRow | null;
    // Deliberately the same 404 as a post that does not exist: a distinct
    // "you may not see this" would confirm the post is there, which is what
    // hiding it was for.
    if (!post) throw new DirectoryError("POST_NOT_FOUND", `No post ${id} on this instance.`, 404);
    return this.present(post, viewerId, 0, withPendingNotes);
  }

  /** Direct replies, oldest first, the way a conversation reads. */
  async replies(id: string, viewerId: string | null = null): Promise<PresentedPost[]> {
    await this.requirePost(id);
    const suspended = await this.social.suspendedAuthorIds();
    const posts = (await this.prisma.post.findMany({
      where: {
        replyToId: id,
        deletedAt: null,
        ...(suspended.length ? { authorId: { notIn: suspended } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: POST_SELECT,
    })) as PostRow[];
    return Promise.all(posts.map((p) => this.present(p, viewerId)));
  }

  /** Idempotent per account: liking twice leaves one like, and unlikes cleanly. */
  async setLike(id: string, userId: string, liked: boolean): Promise<PresentedPost> {
    const target = await this.requirePost(id);
    await this.social.assertNotBlockedBy(userId, target.authorId);
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
    const target = await this.requirePost(id);
    await this.social.assertNotBlockedBy(userId, target.authorId);
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
