import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useSession } from "../hooks/useSession";
import { Link } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";
import { TimelineSkeleton } from "../components/LoadingSpinner";
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
  const [composing, setComposing] = useState<ComposerTarget>(null);
  const openReply = (post: ApiPost) => setComposing({ mode: "reply", post });
  const openQuote = (post: ApiPost) => setComposing({ mode: "quote", post });

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

      {active ? (
        <PostComposer />
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
        <TimelineSkeleton />
      ) : tab === "following" && !active ? (
        <div className="empty-state">
          <h2>Sign in to see your following feed</h2>
          <p>Following is chronological: the accounts you follow, newest first.</p>
        </div>
      ) : posts.length > 0 ? (
        <ul>
          {posts.map((post, i) => (
            // Staggered, but only for the first handful — past that it is a
            // delay before you can read anything rather than an effect.
            <li
              key={post.id}
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}
            >
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
