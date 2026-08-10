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
import { DirectoryError } from "../users/user-directory.service";

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
}

/**
 * In-memory Community Notes store.
 *
 * Notes are keyed to a post id; the post itself lives elsewhere (and, for now,
 * nowhere — the posts module is still a placeholder), so nothing here assumes a
 * post exists. Written to move to Prisma without changing this surface; the
 * CommunityNote and CommunityNoteRating models are already in the schema.
 */
@Injectable()
export class CommunityNotesService {
  private notes = new Map<string, CommunityNote>();
  /** noteId -> rater -> helpful. One rating per rater, changeable. */
  private ratings = new Map<string, Map<string, boolean>>();
  private seq = 0;

  private present(note: CommunityNote): PresentedNote {
    const status = communityNoteStatus(note.helpfulCount, note.notHelpfulCount);
    return {
      ...note,
      status,
      statusLabel: COMMUNITY_NOTE_STATUS_LABELS[status],
      classificationLabel: COMMUNITY_NOTE_CLASSIFICATION_LABELS[note.classification],
      visibleOnPost: isNoteVisibleOnPost(status),
      ratingsNeeded: ratingsUntilRated(note.helpfulCount, note.notHelpfulCount),
      totalRatings: note.helpfulCount + note.notHelpfulCount,
      publishedBy: COMMUNITY_NOTES_ACCOUNT.username,
    };
  }

  private require(id: string): CommunityNote {
    const note = this.notes.get(id);
    if (!note) throw new DirectoryError("NOTE_NOT_FOUND", `No note ${id} on this instance.`, 404);
    return note;
  }

  create(input: {
    postId: string;
    body: string;
    classification?: CommunityNoteClassification;
    sourceUrl?: string;
    author?: string;
  }): PresentedNote {
    this.seq += 1;
    const note: CommunityNote = {
      id: `note_${Date.now().toString(36)}${this.seq.toString(36)}`,
      postId: input.postId,
      author: input.author ?? null,
      classification: input.classification ?? "MISSING_CONTEXT",
      body: input.body,
      sourceUrl: input.sourceUrl ?? null,
      helpfulCount: 0,
      notHelpfulCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.notes.set(note.id, note);
    this.ratings.set(note.id, new Map());
    return this.present(note);
  }

  get(id: string): PresentedNote {
    return this.present(this.require(id));
  }

  /** Every note, newest first, optionally for one post. */
  list(postId?: string): PresentedNote[] {
    return [...this.notes.values()]
      .filter((n) => !postId || n.postId === postId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((n) => this.present(n));
  }

  /** Notes shown on a post — helpful ones only. */
  forPost(postId: string): PresentedNote[] {
    return this.list(postId).filter((n) => n.visibleOnPost);
  }

  /**
   * Rate a note. A rater has one vote per note and may change it; re-sending
   * the same verdict is a no-op rather than a second vote.
   */
  rate(id: string, rater: string, helpful: boolean): PresentedNote {
    const note = this.require(id);
    const byRater = this.ratings.get(note.id) ?? new Map<string, boolean>();
    const previous = byRater.get(rater);

    if (previous === helpful) return this.present(note);

    if (previous === true) note.helpfulCount -= 1;
    if (previous === false) note.notHelpfulCount -= 1;
    if (helpful) note.helpfulCount += 1;
    else note.notHelpfulCount += 1;

    byRater.set(rater, helpful);
    this.ratings.set(note.id, byRater);
    return this.present(note);
  }

  /** Wipe notes — used by tests and by operators clearing demo data. */
  reset() {
    const removed = this.notes.size;
    this.notes.clear();
    this.ratings.clear();
    return { removed };
  }
}
