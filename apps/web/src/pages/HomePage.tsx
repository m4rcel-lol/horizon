import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MediaIcon, PollIcon, EmojiIcon, ScheduleIcon } from "../icons";
import { api, ApiError } from "../api";
import { useSession } from "../hooks/useSession";
import { Link } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { ComposerModal, type ComposerTarget } from "../components/ComposerModal";
import type { ApiPost } from "../api";

const tabs = [
  { id: "for-you", label: "For you" },
  { id: "following", label: "Following" },
] as const;

export function HomePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("for-you");
  const { active } = useSession();

  // Two separate queries rather than one filtered client-side: the Following
  // feed is a different set of rows, not a subset of what For you returned.
  const { data, isLoading } = useQuery({
    queryKey: ["posts", tab],
    queryFn: () => (tab === "following" ? api.followingTimeline() : api.listPosts()),
    enabled: tab === "for-you" || Boolean(active),
  });
  const posts = data?.posts ?? [];
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // The rail's Post button links to #composer; focus it on arrival.
  useEffect(() => {
    if (window.location.hash === "#composer") composerRef.current?.focus();
  }, []);
  const [postError, setPostError] = useState<string | null>(null);
  const [composing, setComposing] = useState<ComposerTarget>(null);
  const openReply = (post: ApiPost) => setComposing({ mode: "reply", post });
  const openQuote = (post: ApiPost) => setComposing({ mode: "quote", post });

  const publish = useMutation({
    mutationFn: (content: string) => api.createPost(content),
    onSuccess: () => {
      setDraft("");
      setPostError(null);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err) =>
      setPostError(err instanceof ApiError ? err.message : "Could not publish that. Try again."),
  });

  return (
    <div>
      <header className="x-header hidden md:flex">
        <h1 className="x-title">Home</h1>
      </header>

      <div className="x-tabs sticky top-[53px] md:top-[53px] z-10" role="tablist" aria-label="Timeline">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="x-tab"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      {active ? (
      <div className="flex gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <img src={active.avatarUrl || "/assets/default-avatar.svg"} alt="" className="avatar w-10 h-10" />
        <div className="flex-1 min-w-0">
          <textarea
            id="composer"
            ref={composerRef}
            rows={2}
            placeholder="What's happening?"
            aria-label="Post text"
            maxLength={500}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-transparent text-[20px] outline-none resize-none placeholder:text-[var(--color-text-secondary)] py-2"
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1" style={{ color: "var(--color-primary)" }}>
              {[MediaIcon, PollIcon, EmojiIcon, ScheduleIcon].map((Icon, i) => (
                <span key={i} className="icon-btn">
                  <Icon className="w-5 h-5" />
                </span>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary px-4"
              disabled={!draft.trim() || publish.isPending}
              onClick={() => publish.mutate(draft.trim())}
            >
              {publish.isPending ? "Posting…" : "Post"}
            </button>
          </div>
          {postError ? (
            <p role="alert" className="text-[14px] mt-1" style={{ color: "var(--color-danger)" }}>
              {postError}
            </p>
          ) : null}
        </div>
      </div>
      ) : (
        <div className="px-4 py-4 border-b flex flex-wrap items-center gap-3" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-[15px] flex-1 min-w-[200px]" style={{ color: "var(--color-text-secondary)" }}>
            Sign in to post, reply, and rate Community Notes.
          </p>
          <Link to="/login" className="btn btn-outline">Sign in</Link>
          <Link to="/register" className="btn btn-primary">Create account</Link>
        </div>
      )}

      {isLoading ? (
        <p className="px-4 py-6 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Loading timeline…
        </p>
      ) : tab === "following" && !active ? (
        <div className="empty-state">
          <h2>Sign in to see your following feed</h2>
          <p>Following is chronological: the accounts you follow, newest first.</p>
        </div>
      ) : posts.length > 0 ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} onReply={openReply} onQuote={openQuote} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>{tab === "for-you" ? "Nothing here yet" : "Your following feed is empty"}</h2>
          <p>
            {tab === "for-you"
              ? "Posts from across the instance appear here. Ranking is deterministic and non-AI — administrators control the signals."
              : "Following is chronological. Follow people and their posts show up here, newest first."}
          </p>
        </div>
      )}

      <ComposerModal target={composing} onClose={() => setComposing(null)} />
    </div>
  );
}
