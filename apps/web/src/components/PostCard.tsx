import { Link } from "react-router-dom";
import { ReplyIcon, RepostIcon, LikeIcon, ShareIcon } from "../icons";
import type { ApiPost } from "../api";
import { Avatar, NameWithBadges } from "./Verification";
import { CommunityNoteCard } from "./CommunityNote";

/** "3h", "2d", or a date once it stops being recent. */
function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * A post as it appears in a timeline or in full.
 *
 * The author's badge, affiliation mark and avatar shape all come from the API
 * payload, so a post carries the same identity everywhere it is rendered — and
 * a verification change is reflected the next time the timeline loads.
 */
export function PostCard({
  post,
  detail = false,
  onRateNote,
  ratingNote = false,
}: {
  post: ApiPost;
  /** Full view: larger type, timestamp on its own line, notes rateable. */
  detail?: boolean;
  onRateNote?: (noteId: string, helpful: boolean) => void;
  ratingNote?: boolean;
}) {
  const author = post.author;
  const handle = author?.username ?? post.authorUsername;
  const permalink = `/${handle}/status/${post.id}`;

  const identity = (
    <NameWithBadges
      displayName={author?.displayName ?? `@${handle}`}
      verification={author?.effectiveVerification ?? "NONE"}
      affiliatedTo={author?.affiliatedTo}
      badgeHref={author && author.affiliateCount > 0 ? `/${handle}/affiliates` : undefined}
      badgeTitle={author && author.affiliateCount > 0 ? "See affiliated accounts" : undefined}
    />
  );

  const body = (
    <>
      <p className={detail ? "text-[17px] leading-6 mt-3" : "text-[15px] leading-5 mt-0.5"}>{post.content}</p>

      {post.notes.length > 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          {post.notes.map((note) => (
            <CommunityNoteCard
              key={note.id}
              note={note}
              onRate={detail && onRateNote ? (helpful) => onRateNote(note.id, helpful) : undefined}
              rating={ratingNote}
            />
          ))}
        </div>
      ) : null}

      <div
        className="flex justify-between max-w-[425px] mt-3"
        style={{ color: "var(--color-text-secondary)" }}
        aria-hidden="true"
      >
        {[ReplyIcon, RepostIcon, LikeIcon, ShareIcon].map((Icon, i) => (
          <span key={i} className="icon-btn">
            <Icon className="w-[18px] h-[18px]" />
          </span>
        ))}
      </div>
    </>
  );

  if (detail) {
    return (
      <article className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex gap-3">
          <Link to={`/${handle}`}>
            <Avatar shape={author?.avatarShape ?? "circle"} size={48} />
          </Link>
          <div className="min-w-0">
            <Link to={`/${handle}`} className="font-bold leading-5 hover:underline">
              {identity}
            </Link>
            <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
              @{handle}
            </p>
          </div>
        </div>
        {body}
        <p className="mt-3 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
          {new Date(post.createdAt).toLocaleString()}
        </p>
      </article>
    );
  }

  return (
    <article
      className="flex gap-3 px-4 py-3 border-b transition-colors hover:bg-[var(--color-row-hover)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Link to={`/${handle}`} className="shrink-0">
        <Avatar shape={author?.avatarShape ?? "circle"} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] min-w-0">
          <Link to={`/${handle}`} className="font-bold hover:underline min-w-0">
            {identity}
          </Link>
          <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>
            @{handle}
          </span>
          <span style={{ color: "var(--color-text-secondary)" }}>·</span>
          <Link to={permalink} className="hover:underline shrink-0" style={{ color: "var(--color-text-secondary)" }}>
            {relativeTime(post.createdAt)}
          </Link>
        </div>
        {body}
      </div>
    </article>
  );
}
