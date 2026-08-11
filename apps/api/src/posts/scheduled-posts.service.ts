import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, forwardRef } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";
import { PostsService } from "./posts.service";

/** How often the publisher looks for posts that have come due. */
const TICK_MS = 30_000;

/** The furthest ahead a post may be scheduled. */
const MAX_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Posts written now and published later.
 *
 * The row is the schedule; publishing turns it into a real post. A timer in
 * the API does the work rather than the worker, because the worker has no
 * database access wired up and a scheduled post that never publishes is worse
 * than no scheduling at all.
 *
 * Publishing is guarded by a status transition, so two ticks overlapping
 * cannot publish the same row twice.
 */
@Injectable()
export class ScheduledPostsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledPostsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PostsService))
    private readonly posts: PostsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.publishDue();
    }, TICK_MS);
    // Anything that came due while the API was down publishes on the next tick.
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async schedule(input: {
    userId: string;
    username: string;
    content: string;
    scheduledFor: Date;
    replyToId?: string;
    quoteOfId?: string;
    mediaIds?: string[];
  }) {
    const when = input.scheduledFor.getTime();
    if (Number.isNaN(when)) {
      throw new DirectoryError("BAD_SCHEDULE", "That is not a valid date and time.", 400);
    }
    // A minute of slack, so "in one minute" chosen a few seconds ago still works.
    if (when < Date.now() - 60_000) {
      throw new DirectoryError("SCHEDULE_IN_PAST", "Pick a time in the future.", 400);
    }
    if (when > Date.now() + MAX_AHEAD_MS) {
      throw new DirectoryError("SCHEDULE_TOO_FAR", "Posts can be scheduled up to a year ahead.", 400);
    }

    const row = await this.prisma.scheduledPost.create({
      data: {
        userId: input.userId,
        content: input.content,
        mediaIds: input.mediaIds ?? [],
        replyToId: input.replyToId ?? null,
        quoteOfId: input.quoteOfId ?? null,
        scheduledFor: input.scheduledFor,
      },
      select: { id: true, content: true, scheduledFor: true, status: true },
    });
    return {
      scheduled: {
        id: row.id,
        content: row.content,
        scheduledFor: row.scheduledFor.toISOString(),
        status: row.status,
      },
    };
  }

  async list(userId: string) {
    const rows = await this.prisma.scheduledPost.findMany({
      where: { userId, status: "pending" },
      orderBy: { scheduledFor: "asc" },
      select: { id: true, content: true, scheduledFor: true, status: true },
    });
    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      scheduledFor: r.scheduledFor.toISOString(),
      status: r.status,
    }));
  }

  async cancel(id: string, userId: string) {
    const { count } = await this.prisma.scheduledPost.updateMany({
      where: { id, userId, status: "pending" },
      data: { status: "cancelled" },
    });
    if (count === 0) {
      throw new DirectoryError("NOT_SCHEDULED", "No pending scheduled post with that id.", 404);
    }
    return { cancelled: true };
  }

  /** Publish everything that has come due. Safe to run concurrently. */
  async publishDue() {
    let due: { id: string }[];
    try {
      due = await this.prisma.scheduledPost.findMany({
        where: { status: "pending", scheduledFor: { lte: new Date() } },
        take: 50,
        select: { id: true },
      });
    } catch (error) {
      this.logger.warn(`Could not look for due scheduled posts: ${error}`);
      return;
    }

    for (const { id } of due) {
      // Claim it first. updateMany with the status in the filter is atomic, so
      // only one tick can move a row out of "pending".
      const { count } = await this.prisma.scheduledPost.updateMany({
        where: { id, status: "pending" },
        data: { status: "publishing" },
      });
      if (count === 0) continue;

      const row = await this.prisma.scheduledPost.findUnique({
        where: { id },
        select: {
          content: true,
          mediaIds: true,
          replyToId: true,
          quoteOfId: true,
          user: { select: { id: true, username: true } },
        },
      });
      if (!row) continue;

      try {
        await this.posts.create({
          author: row.user.username,
          content: row.content,
          replyToId: row.replyToId ?? undefined,
          quoteOfId: row.quoteOfId ?? undefined,
          mediaIds: row.mediaIds,
          viewerId: row.user.id,
        });
        await this.prisma.scheduledPost.update({
          where: { id },
          data: { status: "published", publishedAt: new Date() },
        });
        this.logger.log(`Published scheduled post ${id} for @${row.user.username}`);
      } catch (error) {
        // Left as failed rather than retried forever: the reason is usually
        // something that will not fix itself, like a deleted parent post.
        await this.prisma.scheduledPost.update({ where: { id }, data: { status: "failed" } });
        this.logger.warn(`Scheduled post ${id} failed to publish: ${error}`);
      }
    }
  }
}
