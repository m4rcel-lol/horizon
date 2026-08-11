import { Injectable } from "@nestjs/common";
import {
  COMMUNITY_NOTES_ACCOUNT,
  COMMUNITY_NOTE_CLASSIFICATION_LABELS,
  COMMUNITY_NOTE_STATUS_LABELS,
  communityNoteStatus,
  isNoteVisibleOnPost,
  ratingsUntilRated,
  type CommunityNoteClassification,
  type CommunityNoteStatus,
} from "@horizon/shared";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";

export interface CommunityNote {
  id: string;
  postId: string;
  author: string | null;
  classification: CommunityNoteClassification;
  body: string;
  sourceUrl: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
}

export interface PresentedNote extends CommunityNote {
  status: CommunityNoteStatus;
  statusLabel: string;
  classificationLabel: string;
  /** Only notes readers rated helpful are attached to the post itself. */
  visibleOnPost: boolean;
  ratingsNeeded: number;
  totalRatings: number;
  /** The account that publishes notes, for attribution in the UI. */
  publishedBy: string;
  /** How the caller rated it, so the buttons show their own vote. */
  viewerRating: boolean | null;
}

const NOTE_SELECT = {
  id: true,
  postId: true,
  classification: true,
  body: true,
  sourceUrl: true,
  helpfulCount: true,
  notHelpfulCount: true,
  createdAt: true,
  author: { select: { username: true } },
} as const;

type NoteRow = {
  id: string;
  postId: string;
  classification: CommunityNoteClassification;
  body: string;
  sourceUrl: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: Date;
  author: { username: string } | null;
};

/**
 * Community Notes, stored in Postgres.
 *
 * This used to be a Map in memory, which meant every note and every rating was
 * lost when the API restarted — the one thing a system built on accumulated
 * reader judgement cannot afford.
 *
 * `status` is denormalised onto the row so a timeline can filter to visible
 * notes without recounting ratings for every post it renders. It is recomputed
 * inside the same transaction as the rating that changed it, so it cannot fall
 * out of step with the counts.
 */
@Injectable()
export class CommunityNotesService {
  constructor(private readonly prisma: PrismaService) {}

  private present(note: NoteRow, viewerRating: boolean | null = null): PresentedNote {
    const status = communityNoteStatus(note.helpfulCount, note.notHelpfulCount);
    return {
      id: note.id,
      postId: note.postId,
      author: note.author?.username ?? null,
      classification: note.classification,
      body: note.body,
      sourceUrl: note.sourceUrl,
      helpfulCount: note.helpfulCount,
      notHelpfulCount: note.notHelpfulCount,
      createdAt: note.createdAt.toISOString(),
      status,
      statusLabel: COMMUNITY_NOTE_STATUS_LABELS[status],
      classificationLabel: COMMUNITY_NOTE_CLASSIFICATION_LABELS[note.classification],
      visibleOnPost: isNoteVisibleOnPost(status),
      ratingsNeeded: ratingsUntilRated(note.helpfulCount, note.notHelpfulCount),
      totalRatings: note.helpfulCount + note.notHelpfulCount,
      publishedBy: COMMUNITY_NOTES_ACCOUNT.username,
      viewerRating,
    };
  }

  /** Attach the caller's own vote to each note in one extra query, not N. */
  private async withViewerRatings(
    notes: NoteRow[],
    viewerId: string | null,
  ): Promise<PresentedNote[]> {
    if (!viewerId || notes.length === 0) return notes.map((n) => this.present(n));
    const mine = await this.prisma.communityNoteRating.findMany({
      where: { userId: viewerId, noteId: { in: notes.map((n) => n.id) } },
      select: { noteId: true, helpful: true },
    });
    const byNote = new Map(mine.map((r) => [r.noteId, r.helpful]));
    return notes.map((n) => this.present(n, byNote.get(n.id) ?? null));
  }

  async create(input: {
    postId: string;
    body: string;
    classification?: CommunityNoteClassification;
    sourceUrl?: string;
    authorId?: string | null;
  }): Promise<PresentedNote> {
    // The note is a foreign key onto the post now, so a note about nothing is
    // rejected rather than stored and never displayed.
    const post = await this.prisma.post.findFirst({
      where: { id: input.postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) {
      throw new DirectoryError("POST_NOT_FOUND", `No post ${input.postId} on this instance.`, 404);
    }

    const note = (await this.prisma.communityNote.create({
      data: {
        postId: input.postId,
        authorId: input.authorId ?? null,
        classification: input.classification ?? "MISSING_CONTEXT",
        body: input.body,
        sourceUrl: input.sourceUrl ?? null,
        status: communityNoteStatus(0, 0),
      },
      select: NOTE_SELECT,
    })) as NoteRow;
    return this.present(note);
  }

  async get(id: string, viewerId: string | null = null): Promise<PresentedNote> {
    const note = (await this.prisma.communityNote.findUnique({
      where: { id },
      select: NOTE_SELECT,
    })) as NoteRow | null;
    if (!note) throw new DirectoryError("NOTE_NOT_FOUND", `No note ${id} on this instance.`, 404);
    const [presented] = await this.withViewerRatings([note], viewerId);
    return presented;
  }

  /** Every note, newest first, optionally for one post. */
  async list(postId?: string, viewerId: string | null = null): Promise<PresentedNote[]> {
    const notes = (await this.prisma.communityNote.findMany({
      where: postId ? { postId } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      select: NOTE_SELECT,
    })) as NoteRow[];
    return this.withViewerRatings(notes, viewerId);
  }

  /**
   * Notes shown on a post — helpful ones only.
   *
   * Filtered on the stored status in the query rather than by loading every
   * note and recomputing, because this runs once per post in a timeline.
   */
  async forPost(postId: string, viewerId: string | null = null): Promise<PresentedNote[]> {
    const notes = (await this.prisma.communityNote.findMany({
      where: { postId, status: "HELPFUL" },
      orderBy: { createdAt: "desc" },
      select: NOTE_SELECT,
    })) as NoteRow[];
    return this.withViewerRatings(notes, viewerId);
  }

  /**
   * Rate a note. A rater has one vote per note and may change it; re-sending
   * the same verdict is a no-op rather than a second vote.
   */
  async rate(id: string, userId: string, helpful: boolean): Promise<PresentedNote> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const note = await tx.communityNote.findUnique({
        where: { id },
        select: { id: true, helpfulCount: true, notHelpfulCount: true },
      });
      if (!note) throw new DirectoryError("NOTE_NOT_FOUND", `No note ${id} on this instance.`, 404);

      const previous = await tx.communityNoteRating.findUnique({
        where: { noteId_userId: { noteId: id, userId } },
        select: { helpful: true },
      });
      if (previous?.helpful === helpful) return null;

      let { helpfulCount, notHelpfulCount } = note;
      if (previous?.helpful === true) helpfulCount -= 1;
      if (previous?.helpful === false) notHelpfulCount -= 1;
      if (helpful) helpfulCount += 1;
      else notHelpfulCount += 1;

      await tx.communityNoteRating.upsert({
        where: { noteId_userId: { noteId: id, userId } },
        update: { helpful },
        create: { noteId: id, userId, helpful },
      });

      // Recomputed here, in the same transaction, so the stored status the
      // timeline filters on always matches the counts it was derived from.
      return (await tx.communityNote.update({
        where: { id },
        data: {
          helpfulCount,
          notHelpfulCount,
          status: communityNoteStatus(helpfulCount, notHelpfulCount),
        },
        select: NOTE_SELECT,
      })) as NoteRow;
    });

    if (!updated) return this.get(id, userId);
    return this.present(updated, helpful);
  }

  /** Wipe notes — used by operators clearing demo data. */
  async reset() {
    const { count } = await this.prisma.communityNote.deleteMany({});
    return { removed: count };
  }
}
