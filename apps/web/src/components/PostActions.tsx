import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ReplyIcon, RepostIcon, LikeIcon, ShareIcon, QuoteIcon, BookmarksIcon, MoreIcon } from "../icons";
import { api, ApiError, type ApiPost } from "../api";
import { useSession } from "../hooks/useSession";

/** Counts read better absent than as a zero. */
function count(n: number) {
  return n > 0 ? <span className="text-[13px] tabular-nums">{n}</span> : null;
}

function Action({
  label,
  onClick,
  active,
  activeColor,
  hoverColor,
  children,
}: {
  label: string;
  onClick: (event: React.MouseEvent) => void;
  active?: boolean;
  activeColor?: string;
  hoverColor: string;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(event) => {
        // The whole row is a link to the post; an action is not navigation.
        event.preventDefault();
        event.stopPropagation();
        onClick(event);
      }}
      className="group flex items-center gap-1 rounded-full transition-colors"
      style={{
        minHeight: 32,
        paddingRight: 8,
        color: active && activeColor ? activeColor : hover ? hoverColor : "var(--color-text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Reply, repost, like and share for one post.
 *
 * Every mutation replaces the post in the cache with the server's copy rather
 * than adjusting a local number, so the count shown is the count stored — two
 * tabs, or a second device, cannot drift apart.
 */
export function PostActions({
  post,
  onReply,
  onQuote,
  size = 18,
}: {
  post: ApiPost;
  onReply: (post: ApiPost) => void;
  onQuote: (post: ApiPost) => void;
  size?: number;
}) {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [repostOpen, setRepostOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repostRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!repostOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (repostRef.current && !repostRef.current.contains(event.target as Node)) {
        setRepostOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setRepostOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [repostOpen]);

  /** Refresh everything the post appears in: timeline, profile, and its own page. */
  const settle = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    queryClient.invalidateQueries({ queryKey: ["replies"] });
  };

  const like = useMutation({
    mutationFn: (on: boolean) => api.setLike(post.id, on),
    onSuccess: settle,
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not save that."),
  });

  const repost = useMutation({
    mutationFn: (on: boolean) => api.setRepost(post.id, on),
    onSuccess: settle,
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not save that."),
  });

  const bookmark = useMutation({
    mutationFn: (on: boolean) => api.setBookmark(post.id, on),
    onSuccess: () => {
      settle();
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not save that."),
  });

  const remove = useMutation({
    mutationFn: () => api.deletePost(post.id),
    onSuccess: () => {
      settle();
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not delete that."),
  });

  const requireSession = () => {
    if (isAuthenticated) return true;
    navigate("/login");
    return false;
  };

  const iconStyle = { width: size, height: size } as const;

  return (
    <div
      className="flex justify-between max-w-[425px] mt-3"
      onClick={(event) => event.stopPropagation()}
    >
      <Action label="Reply" hoverColor="var(--color-primary)" onClick={() => requireSession() && onReply(post)}>
        <span className="icon-btn group-hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
          <ReplyIcon style={iconStyle} />
        </span>
        {count(post.replyCount)}
      </Action>

      <div className="relative" ref={repostRef}>
        <Action
          label="Repost"
          hoverColor="var(--color-success, #00ba7c)"
          active={post.repostedByViewer}
          activeColor="var(--color-success, #00ba7c)"
          onClick={() => requireSession() && setRepostOpen((o) => !o)}
        >
          <span className="icon-btn group-hover:bg-[color-mix(in_srgb,#00ba7c_12%,transparent)]">
            <RepostIcon style={iconStyle} />
          </span>
          {count(post.repostCount + post.quoteCount)}
        </Action>

        {repostOpen ? (
          <div
            role="menu"
            className="absolute left-0 top-full mt-1 w-[220px] rounded-2xl border shadow-xl z-50 overflow-hidden"
            style={{
              background: "var(--color-bg)",
              borderColor: "var(--color-border)",
              boxShadow: "0 0 15px rgba(0,0,0,0.2)",
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-[15px] font-bold hover:bg-[var(--color-bg-secondary)]"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setRepostOpen(false);
                repost.mutate(!post.repostedByViewer);
              }}
            >
              <RepostIcon className="w-[18px] h-[18px]" />
              {post.repostedByViewer ? "Undo repost" : "Repost"}
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-[15px] font-bold hover:bg-[var(--color-bg-secondary)]"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setRepostOpen(false);
                onQuote(post);
              }}
            >
              <QuoteIcon className="w-[18px] h-[18px]" />
              Quote
            </button>
          </div>
        ) : null}
      </div>

      <Action
        label={post.likedByViewer ? "Undo like" : "Like"}
        hoverColor="var(--color-danger, #f91880)"
        active={post.likedByViewer}
        activeColor="var(--color-danger, #f91880)"
        onClick={() => requireSession() && like.mutate(!post.likedByViewer)}
      >
        <span className="icon-btn group-hover:bg-[color-mix(in_srgb,#f91880_12%,transparent)]">
          <LikeIcon style={iconStyle} />
        </span>
        {count(post.likeCount)}
      </Action>

      <Action
        label={post.bookmarkedByViewer ? "Remove bookmark" : "Bookmark"}
        hoverColor="var(--color-primary)"
        active={post.bookmarkedByViewer}
        activeColor="var(--color-primary)"
        onClick={() => requireSession() && bookmark.mutate(!post.bookmarkedByViewer)}
      >
        <span className="icon-btn group-hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
          <BookmarksIcon style={iconStyle} />
        </span>
      </Action>

      <Action
        label={copied ? "Link copied" : "Copy link to post"}
        hoverColor="var(--color-primary)"
        onClick={() => {
          const url = `${window.location.origin}/${post.authorUsername}/status/${post.id}`;
          navigator.clipboard?.writeText(url).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            },
            () => setError("Could not copy the link."),
          );
        }}
      >
        <span className="icon-btn group-hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
          <ShareIcon style={iconStyle} />
        </span>
        {copied ? <span className="text-[13px]">Copied</span> : null}
      </Action>

      {post.deletableByViewer ? (
        <div className="relative" ref={moreRef}>
          <Action
            label="More options for this post"
            hoverColor="var(--color-danger, #f91880)"
            onClick={() => setMoreOpen((o) => !o)}
          >
            <span className="icon-btn group-hover:bg-[color-mix(in_srgb,#f91880_12%,transparent)]">
              <MoreIcon style={iconStyle} />
            </span>
          </Action>
          {moreOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 w-[200px] rounded-2xl border shadow-xl z-50 overflow-hidden"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                boxShadow: "0 0 15px rgba(0,0,0,0.2)",
              }}
            >
              <button
                type="button"
                role="menuitem"
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-[15px] font-bold hover:bg-[var(--color-bg-secondary)]"
                style={{ color: "var(--color-danger, #f91880)" }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMoreOpen(false);
                  remove.mutate();
                }}
              >
                Delete post
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <span role="alert" className="sr-only">
          {error}
        </span>
      ) : null}
    </div>
  );
}
