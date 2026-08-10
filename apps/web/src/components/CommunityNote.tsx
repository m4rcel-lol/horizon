import { Link } from "react-router-dom";
import { COMMUNITY_NOTES_ACCOUNT, type CommunityNoteStatus } from "@horizon/shared";
import type { ApiNote } from "../api";

function statusTone(status: CommunityNoteStatus) {
  if (status === "HELPFUL") return { color: "var(--color-success)" };
  if (status === "NOT_HELPFUL") return { color: "var(--color-danger)" };
  return { color: "var(--color-text-secondary)" };
}

/**
 * The context card readers see on a post.
 *
 * Deliberately plain: it states who wrote it, what they flagged, and lets the
 * reader judge whether it helped — no emphasis that would read as the instance
 * itself taking a side.
 */
export function CommunityNoteCard({
  note,
  onRate,
  rating = false,
  showStatus = false,
}: {
  note: ApiNote;
  onRate?: (helpful: boolean) => void;
  rating?: boolean;
  showStatus?: boolean;
}) {
  return (
    <article
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--color-border-strong)", background: "var(--color-bg-secondary)" }}
    >
      <header className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-[15px]">Readers added context</span>
        <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          · {note.classificationLabel}
        </span>
      </header>

      <p className="mt-2 text-[15px] leading-5">{note.body}</p>

      {note.sourceUrl ? (
        <p className="mt-2 text-[14px]">
          <a href={note.sourceUrl} className="link" rel="noopener noreferrer nofollow">
            {note.sourceUrl}
          </a>
        </p>
      ) : null}

      <p className="mt-3 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        Published by{" "}
        <Link to={`/${COMMUNITY_NOTES_ACCOUNT.username}`} className="link">
          @{note.publishedBy}
        </Link>
        {note.author ? ` · written by @${note.author}` : null}
      </p>

      {showStatus ? (
        <p className="mt-1 text-[13px] font-medium" style={statusTone(note.status)}>
          {note.statusLabel}
          <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>
            {" · "}
            {note.helpfulCount} helpful / {note.notHelpfulCount} not helpful
            {note.ratingsNeeded > 0 ? ` · ${note.ratingsNeeded} more rating${note.ratingsNeeded === 1 ? "" : "s"} needed` : null}
          </span>
        </p>
      ) : null}

      {onRate ? (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
            Do you find this helpful?
          </span>
          <button type="button" className="btn btn-outline" disabled={rating} onClick={() => onRate(true)}>
            Yes
          </button>
          <button type="button" className="btn btn-outline" disabled={rating} onClick={() => onRate(false)}>
            No
          </button>
        </div>
      ) : null}
    </article>
  );
}
