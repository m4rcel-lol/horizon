/**
 * Community Notes.
 *
 * Contributors attach context to a post; readers rate whether that context is
 * helpful. A note is only shown on the post once enough readers agree it is —
 * until then it stays pending, and it is never shown once readers reject it.
 */

export type CommunityNoteStatus = "NEEDS_MORE_RATINGS" | "HELPFUL" | "NOT_HELPFUL";

export type CommunityNoteClassification =
  | "MISLEADING"
  | "MISSING_CONTEXT"
  | "DISPUTED"
  | "OUTDATED"
  | "SATIRE";

export const COMMUNITY_NOTE_CLASSIFICATIONS: CommunityNoteClassification[] = [
  "MISSING_CONTEXT",
  "MISLEADING",
  "DISPUTED",
  "OUTDATED",
  "SATIRE",
];

export const COMMUNITY_NOTE_CLASSIFICATION_LABELS: Record<CommunityNoteClassification, string> = {
  MISSING_CONTEXT: "Missing context",
  MISLEADING: "Misleading",
  DISPUTED: "Disputed claim",
  OUTDATED: "Out of date",
  SATIRE: "Satire mistaken as fact",
};

export const COMMUNITY_NOTE_STATUS_LABELS: Record<CommunityNoteStatus, string> = {
  NEEDS_MORE_RATINGS: "Needs more ratings",
  HELPFUL: "Shown on the post",
  NOT_HELPFUL: "Not shown — rated unhelpful",
};

/** Ratings required before a note can leave the pending state. */
export const COMMUNITY_NOTE_MIN_RATINGS = 3;
/** Share of helpful ratings at or above which a note is shown. */
export const COMMUNITY_NOTE_HELPFUL_RATIO = 2 / 3;
/** Share at or below which a note is rejected. */
export const COMMUNITY_NOTE_UNHELPFUL_RATIO = 1 / 3;

/**
 * A note's status from its rating tally.
 *
 * Deliberately a pure threshold rule rather than anything adaptive: an operator
 * reading the numbers can predict the outcome, and a note that has not been
 * rated enough is pending rather than silently treated as rejected.
 */
export function communityNoteStatus(helpful: number, notHelpful: number): CommunityNoteStatus {
  const total = helpful + notHelpful;
  if (total < COMMUNITY_NOTE_MIN_RATINGS) return "NEEDS_MORE_RATINGS";
  const ratio = helpful / total;
  if (ratio >= COMMUNITY_NOTE_HELPFUL_RATIO) return "HELPFUL";
  if (ratio <= COMMUNITY_NOTE_UNHELPFUL_RATIO) return "NOT_HELPFUL";
  return "NEEDS_MORE_RATINGS";
}

/** Only notes readers found helpful are attached to the post itself. */
export function isNoteVisibleOnPost(status: CommunityNoteStatus): boolean {
  return status === "HELPFUL";
}

/** How many more ratings a pending note needs before it can resolve. */
export function ratingsUntilRated(helpful: number, notHelpful: number): number {
  return Math.max(0, COMMUNITY_NOTE_MIN_RATINGS - (helpful + notHelpful));
}

/**
 * The instance-owned account that publishes notes.
 *
 * Seeded on boot, verified as a business, and immutable: it cannot be signed
 * into, edited, suspended, or affiliated with any organisation.
 */
export const COMMUNITY_NOTES_ACCOUNT = {
  username: "CommunityNotes",
  displayName: "Community Notes",
  bio: "Readers add context to posts on this instance. Notes are written and rated by people here, never by an algorithm.",
} as const;
