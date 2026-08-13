import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@horizon/shared";
import { api, ApiError, type AdminPost } from "../api";
import { Avatar } from "../components/Verification";
import { useSession } from "../hooks/useSession";
import { PageLoader } from "../components/LoadingSpinner";

/**
 * Post moderation.
 *
 * Deleting someone else's post was already possible through the API for
 * anyone holding posts.delete, but there was no way to find a post to delete —
 * the only route in was knowing its id. This is that surface.
 *
 * Deleted posts stay in the results, marked: "has this already been dealt
 * with" is exactly the question when the same thing gets reported twice.
 */
export function AdminPostsPage() {
  const { can } = useSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [committed, setCommitted] = useState({ q: "", author: "" });
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-posts", committed, page],
    queryFn: () => api.adminSearchPosts({ ...committed, page }),
    enabled: can(PERMISSIONS.POSTS_VIEW),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.deletePost(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["instance-stats"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not delete that post."),
  });

  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (data?.perPage ?? 25)));

  return (
    <div className="animate-page">
      <form
        className="flex flex-wrap gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setCommitted({ q: query.trim(), author: author.trim().replace(/^@/, "") });
        }}
      >
        <input
          className="x-field flex-1 min-w-[200px]"
          placeholder="Search post text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search posts"
        />
        <input
          className="x-field w-[180px]"
          placeholder="@author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          aria-label="Filter by author"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {error ? (
        <p role="alert" className="mb-3 text-[14px]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <PageLoader label="Loading posts…" />
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h2>No posts match</h2>
          <p>Search by text, by author, or both.</p>
        </div>
      ) : (
        <>
          <p className="text-[13px] mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {total} post{total === 1 ? "" : "s"} · page {data?.page ?? 1} of {pages}
          </p>
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                busy={remove.isPending}
                canDelete={can(PERMISSIONS.POSTS_DELETE)}
                onDelete={(reason) => {
                  setError(null);
                  remove.mutate({ id: p.id, reason });
                }}
              />
            ))}
          </ul>

          {pages > 1 ? (
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((n) => Math.max(1, n - 1))}
              >
                Previous
              </button>
              <span className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                {page} / {pages}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page >= pages}
                onClick={() => setPage((n) => Math.min(pages, n + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function PostRow({
  post,
  busy,
  canDelete,
  onDelete,
}: {
  post: AdminPost;
  busy: boolean;
  canDelete: boolean;
  onDelete: (reason?: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <li
      className="rounded-2xl border p-3"
      style={{ borderColor: "var(--color-border)", opacity: post.deleted ? 0.6 : 1 }}
    >
      <div className="flex gap-3">
        <Avatar size={40} src={post.author.avatarUrl || "/assets/default-avatar.svg"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/${post.author.username}`} className="font-bold hover:underline">
              {post.author.displayName}
            </Link>
            <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              @{post.author.username} · {new Date(post.createdAt).toLocaleString()}
            </span>
            {post.author.suspended ? (
              <span
                className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--color-bg-secondary)", color: "var(--color-danger, #f91880)" }}
              >
                Author suspended
              </span>
            ) : null}
            {post.deleted ? (
              <span
                className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}
              >
                Deleted
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[15px] whitespace-pre-wrap break-words">{post.content}</p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {post.likeCount} likes · {post.replyCount} replies · {post.repostCount} reposts
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link to={`/${post.author.username}/status/${post.id}`} className="btn btn-outline">
            Open
          </Link>
          {canDelete && !post.deleted ? (
            <button
              type="button"
              className="btn btn-outline"
              style={{ color: "var(--color-danger, #f91880)" }}
              disabled={busy}
              onClick={() => setConfirming((v) => !v)}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {confirming && !post.deleted ? (
        <form
          className="mt-3 pt-3 border-t flex flex-wrap gap-2 items-end"
          style={{ borderColor: "var(--color-border)" }}
          onSubmit={(e) => {
            e.preventDefault();
            onDelete(reason.trim() || undefined);
            setConfirming(false);
            setReason("");
          }}
        >
          <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <span
              className="text-[12px] font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Reason (recorded, not shown to the author)
            </span>
            <input
              className="x-field"
              value={reason}
              maxLength={280}
              placeholder="Why this post is being removed"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{ background: "var(--color-danger, #f91880)" }}
          >
            Confirm deletion
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </form>
      ) : null}
    </li>
  );
}
