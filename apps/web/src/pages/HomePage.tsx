import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useSession } from "../hooks/useSession";
import { Link } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";
import { TimelineSkeleton } from "../components/LoadingSpinner";
import { ComposerModal, type ComposerTarget } from "../components/ComposerModal";
import { SeoHead } from "../components/SeoHead";
import type { ApiPost } from "../api";

type TabId = "for-you" | "following" | `c:${string}`;

export function HomePage() {
  const [tab, setTab] = useState<TabId>("for-you");
  const { active } = useSession();

  const { data: communitiesData } = useQuery({
    queryKey: ["communities", "mine", active?.username],
    queryFn: () => api.communitiesFor(active!.username),
    enabled: Boolean(active?.username),
  });
  const myCommunities = communitiesData?.communities ?? [];

  const communitySlug = tab.startsWith("c:") ? tab.slice(2) : null;

  const { data, isLoading } = useQuery({
    queryKey: ["posts", tab],
    queryFn: () => {
      if (tab === "following") return api.followingTimeline();
      if (communitySlug) return api.listCommunityPosts(communitySlug);
      return api.listPosts();
    },
    enabled: tab === "for-you" || Boolean(active) || Boolean(communitySlug),
  });
  const posts = data?.posts ?? [];
  const [composing, setComposing] = useState<ComposerTarget>(null);
  const openReply = (post: ApiPost) => setComposing({ mode: "reply", post });
  const openQuote = (post: ApiPost) => setComposing({ mode: "quote", post });

  return (
    <div>
      <SeoHead title="Home" description="Your Horizon timeline." url="/home" />
      <header className="x-header hidden md:flex">
        <h1 className="x-title">Home</h1>
      </header>

      <div
        className="x-tabs sticky top-[53px] md:top-[53px] z-10 overflow-x-auto"
        role="tablist"
        aria-label="Timeline"
        style={{ background: "var(--color-bg)" }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "for-you"}
          onClick={() => setTab("for-you")}
          className="x-tab shrink-0"
        >
          For you
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "following"}
          onClick={() => setTab("following")}
          className="x-tab shrink-0"
        >
          Following
        </button>
        {myCommunities.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={tab === `c:${c.slug}`}
            onClick={() => setTab(`c:${c.slug}`)}
            className="x-tab shrink-0"
            title={c.name}
          >
            {c.name}
          </button>
        ))}
      </div>

      {active ? (
        <PostComposer />
      ) : (
        <div
          className="px-4 py-4 border-b flex flex-wrap items-center gap-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-[15px] flex-1 min-w-[200px]" style={{ color: "var(--color-text-secondary)" }}>
            Sign in to post, reply, and rate Community Notes.
          </p>
          <Link to="/login" className="btn btn-outline">
            Sign in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Create account
          </Link>
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
          <h2>
            {communitySlug
              ? "No posts in this community yet"
              : tab === "for-you"
                ? "Nothing here yet"
                : "Your following feed is empty"}
          </h2>
          <p>
            {communitySlug
              ? "Posts shared to this community will show up here."
              : tab === "for-you"
                ? "Posts from across the instance appear here."
                : "Follow people and their posts show up here, newest first."}
          </p>
        </div>
      )}

      <ComposerModal target={composing} onClose={() => setComposing(null)} />
    </div>
  );
}
