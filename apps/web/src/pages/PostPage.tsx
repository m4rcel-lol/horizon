import { SeoHead } from "../components/SeoHead";
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api, ApiError, type ApiPost } from "../api";
import { PostCard } from "../components/PostCard";
import { ComposerModal, type ComposerTarget } from "../components/ComposerModal";
import { Avatar } from "../components/Verification";
import { useSession } from "../hooks/useSession";
import { TimelineSkeleton } from "../components/LoadingSpinner";

export function PostPage() {
  const { username, postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { active, isAuthenticated } = useSession();
  const [composing, setComposing] = useState<ComposerTarget>(null);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => api.getPost(postId ?? ""),
    enabled: Boolean(postId),
    retry: false,
  });

  // What this post is answering. A reply on its own page is half a
  // conversation without it — the reader arrives at an answer to something
  // they cannot see.
  const { data: ancestorData } = useQuery({
    queryKey: ["ancestors", postId],
    queryFn: () => api.ancestors(postId ?? ""),
    enabled: Boolean(postId) && !(error instanceof ApiError && error.status === 404),
    retry: false,
  });

  const { data: replyData } = useQuery({
    queryKey: ["replies", postId],
    queryFn: () => api.replies(postId ?? ""),
    enabled: Boolean(postId) && !(error instanceof ApiError && error.status === 404),
    retry: false,
  });

  const rate = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) => api.rateNote(id, helpful),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const sendReply = useMutation({
    mutationFn: (content: string) => api.createPost(content, { replyToId: postId! }),
    onSuccess: () => {
      setReply("");
      setReplyError(null);
      queryClient.invalidateQueries({ queryKey: ["replies", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e) => setReplyError(e instanceof ApiError ? e.message : "Could not post that reply."),
  });

  const post = data?.post;
  const replies = replyData?.posts ?? [];
  const ancestors = ancestorData?.posts ?? [];
  const missing = error instanceof ApiError && error.status === 404;

  const openReply = (target: ApiPost) => setComposing({ mode: "reply", post: target });
  const openQuote = (target: ApiPost) => setComposing({ mode: "quote", post: target });

  return (
    <div>
      <SeoHead
        title={post ? `${post.author?.displayName ?? post.authorUsername}: ${post.content.slice(0, 80)}` : "Post"}
        description={post?.content?.slice(0, 160) || "A post on Horizon"}
        url={post ? `/${post.authorUsername}/status/${post.id}` : undefined}
        image={post?.author?.avatarUrl || "/assets/logo.svg"}
        type="article"
      />

      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">Post</h1>
      </header>

      {isLoading ? (
        <TimelineSkeleton rows={2} />
      ) : missing ? (
        <div className="empty-state">
          <h2>This post doesn&apos;t exist</h2>
          <p>
            It may have been deleted, or the link may be wrong.{" "}
            {username ? (
              <Link to={`/${username}`} className="link">
                Visit @{username}
              </Link>
            ) : null}
          </p>
        </div>
      ) : post ? (
        <>
          {/* The chain that led here, oldest first, each one a card you can
              open in turn — so following a reply upwards keeps working however
              deep the conversation goes. */}
          {ancestors.map((a) => (
            <PostCard key={a.id} post={a} inThread onReply={openReply} onQuote={openQuote} />
          ))}

          <PostCard
            post={post}
            detail
            ratingNote={rate.isPending}
            onRateNote={(id, helpful) => rate.mutate({ id, helpful })}
            onReply={openReply}
            onQuote={openQuote}
          />

          {post.notes.length > 0 ? (
            <p className="px-4 py-2 text-[13px]">
              <Link to="/notes" className="link">
                About Community Notes
              </Link>
            </p>
          ) : null}

          {/* Replying inline, rather than through the modal, because on a post
              page the reply box is the main thing you came to use. */}
          {isAuthenticated ? (
            <div className="flex gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <Avatar
                shape={active?.avatarShape ?? "circle"}
                size={40}
                src={active?.avatarUrl || "/assets/default-avatar.svg"}
              />
              <div className="flex-1 min-w-0">
                <textarea
                  className="w-full bg-transparent text-[17px] leading-6 outline-none resize-none"
                  style={{ minHeight: 52 }}
                  placeholder="Post your reply"
                  maxLength={500}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
                {replyError ? (
                  <p role="alert" className="text-[14px]" style={{ color: "var(--color-danger)" }}>
                    {replyError}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!reply.trim() || sendReply.isPending}
                    onClick={() => sendReply.mutate(reply.trim())}
                  >
                    {sendReply.isPending ? "Replying…" : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="px-4 py-3 border-b text-[15px]" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              <Link to="/login" className="link">
                Sign in
              </Link>{" "}
              to reply.
            </p>
          )}

          {replies.length > 0 ? (
            replies.map((r) => (
              <PostCard key={r.id} post={r} onReply={openReply} onQuote={openQuote} />
            ))
          ) : (
            <div className="empty-state">
              <h2>No replies yet</h2>
              <p>Replies to this post will appear here in the order they were sent.</p>
            </div>
          )}
        </>
      ) : null}

      <ComposerModal target={composing} onClose={() => setComposing(null)} />
    </div>
  );
}
