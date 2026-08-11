import { Link, useNavigate } from "react-router-dom";
import type { ApiPost } from "../api";
import { Avatar, NameWithBadges } from "./Verification";
import { CommunityNoteCard } from "./CommunityNote";
import { PostActions } from "./PostActions";
import { PostMediaGrid, PostPoll } from "./PostMedia";

/** "3h", "2d", or a date once it stops being recent. */
function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function permalinkFor(post: ApiPost) {
  return `/${post.author?.username ?? post.authorUsername}/status/${post.id}`;
}

/**
 * The post a quote is about, embedded inside it.
 *
 * A bordered card rather than a blockquote, because it is a whole other post
 * with its own author — and clicking it opens that post in full, so the thing
 * being quoted is always one tap from the quote.
 */
export function QuotedPost({ post }: { post: ApiPost }) {
  const navigate = useNavigate();
  const author = post.author;
  const handle = author?.username ?? post.authorUsername;

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Quoted post by @${handle}`}
      onClick={(event) => {
        event.stopPropagation();
        navigate(permalinkFor(post));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          navigate(permalinkFor(post));
        }
      }}
      className="mt-3 rounded-2xl border p-3 cursor-pointer transition-colors hover:bg-[var(--color-row-hover)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-2 text-[14px] min-w-0">
        <Avatar
          shape={author?.avatarShape ?? "circle"}
          size={20}
          src={author?.avatarUrl || "/assets/default-avatar.svg"}
        />
        <span className="font-bold truncate">
          <NameWithBadges
            displayName={author?.displayName ?? `@${handle}`}
            verification={author?.effectiveVerification ?? "NONE"}
            affiliatedTo={author?.affiliatedTo}
            badgeClassName="w-[15px] h-[15px]"
          />
        </span>
        <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>
          @{handle}
        </span>
        <span style={{ color: "var(--color-text-secondary)" }}>·</span>
        <span className="shrink-0" style={{ color: "var(--color-text-secondary)" }}>
          {relativeTime(post.createdAt)}
        </span>
      </div>
      <p className="mt-1 text-[15px] leading-5 whitespace-pre-wrap">{post.content}</p>
    </div>
  );
}

/**
 * A post as it appears in a timeline or in full.
 *
 * The author's badge, affiliation mark and avatar shape all come from the API
 * payload, so a post carries the same identity everywhere it is rendered — and
 * a verification change is reflected the next time the timeline loads.
 *
 * In a timeline the whole row opens the post, the way X behaves. Links and
 * action buttons inside it stop the event, so clicking an author still goes to
 * the author.
 */
export function PostCard({
  post,
  detail = false,
  onRateNote,
  ratingNote = false,
  onReply,
  onQuote,
}: {
  post: ApiPost;
  /** Full view: larger type, timestamp on its own line, notes rateable. */
  detail?: boolean;
  onRateNote?: (noteId: string, helpful: boolean) => void;
  ratingNote?: boolean;
  onReply?: (post: ApiPost) => void;
  onQuote?: (post: ApiPost) => void;
}) {
  const navigate = useNavigate();
  const author = post.author;
  const handle = author?.username ?? post.authorUsername;
  const permalink = permalinkFor(post);

  const identity = (
    <NameWithBadges
      displayName={author?.displayName ?? `@${handle}`}
      verification={author?.effectiveVerification ?? "NONE"}
      affiliatedTo={author?.affiliatedTo}
      nameHref={`/${handle}`}
      badgeHref={author && author.affiliateCount > 0 ? `/${handle}/affiliates` : undefined}
      badgeTitle={author && author.affiliateCount > 0 ? "See affiliated accounts" : undefined}
    />
  );

  const replyingTo = post.replyTo ? (
    <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
      Replying to{" "}
      <Link
        to={`/${post.replyTo.authorUsername}`}
        className="link"
        onClick={(event) => event.stopPropagation()}
      >
        @{post.replyTo.authorUsername}
      </Link>
    </p>
  ) : null;

  const body = (
    <>
      {replyingTo}
      <p
        className={`whitespace-pre-wrap ${detail ? "text-[17px] leading-6 mt-3" : "text-[15px] leading-5 mt-0.5"}`}
      >
        {post.content}
      </p>

      <PostMediaGrid media={post.media} />
      {post.poll ? <PostPoll postId={post.id} poll={post.poll} /> : null}

      {post.quoteOf ? <QuotedPost post={post.quoteOf} /> : null}

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

      <PostActions
        post={post}
        size={detail ? 20 : 18}
        onReply={onReply ?? (() => navigate(permalink))}
        onQuote={onQuote ?? (() => navigate(permalink))}
      />
    </>
  );

  if (detail) {
    return (
      <article className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex gap-3">
          <Link to={`/${handle}`}>
            <Avatar
              shape={author?.avatarShape ?? "circle"}
              size={48}
              src={author?.avatarUrl || "/assets/default-avatar.svg"}
            />
          </Link>
          <div className="min-w-0">
            <span className="font-bold leading-5">{identity}</span>
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
      // A row, not a <Link>, so the actions and author links inside it stay
      // valid elements rather than links nested in a link.
      role="link"
      tabIndex={0}
      aria-label={`Post by @${handle}`}
      onClick={() => navigate(permalink)}
      onKeyDown={(event) => {
        if (event.key === "Enter") navigate(permalink);
      }}
      className="flex gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-[var(--color-row-hover)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Link to={`/${handle}`} className="shrink-0" onClick={(event) => event.stopPropagation()}>
        <Avatar
          shape={author?.avatarShape ?? "circle"}
          size={40}
          src={author?.avatarUrl || "/assets/default-avatar.svg"}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] min-w-0">
          <span className="font-bold min-w-0" onClick={(event) => event.stopPropagation()}>
            {identity}
          </span>
          <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>
            @{handle}
          </span>
          <span style={{ color: "var(--color-text-secondary)" }}>·</span>
          <Link
            to={permalink}
            className="hover:underline shrink-0"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={(event) => event.stopPropagation()}
          >
            {relativeTime(post.createdAt)}
          </Link>
        </div>
        {body}
      </div>
    </article>
  );
}
