import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiPost } from "../api";
import { PostCard } from "../components/PostCard";
import { ComposerModal, type ComposerTarget } from "../components/ComposerModal";
import { TimelineSkeleton } from "../components/LoadingSpinner";
import { useSession } from "../hooks/useSession";

export function BookmarksPage() {
  const { isAuthenticated, active } = useSession();
  const [composing, setComposing] = useState<ComposerTarget>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: api.bookmarks,
    enabled: isAuthenticated,
  });
  const posts = data?.posts ?? [];

  return (
    <div>
      <header className="x-header">
        <div className="min-w-0">
          <h1 className="x-title">Bookmarks</h1>
          {active ? (
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              @{active.username}
            </p>
          ) : null}
        </div>
      </header>

      {!isAuthenticated ? (
        <div className="empty-state">
          <h2>Save posts for later</h2>
          <p className="mb-6">Bookmarks are private to your account. Sign in to start saving.</p>
          <Link to="/login" className="btn btn-primary btn-lg">
            Sign in
          </Link>
        </div>
      ) : isLoading ? (
        <TimelineSkeleton />
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h2>Save posts for later</h2>
          <p>
            Tap the bookmark icon under any post and it appears here. Bookmarks are private — nobody
            else can see what you have saved.
          </p>
        </div>
      ) : (
        <ul>
          {posts.map((post: ApiPost) => (
            <li key={post.id}>
              <PostCard
                post={post}
                onReply={(p) => setComposing({ mode: "reply", post: p })}
                onQuote={(p) => setComposing({ mode: "quote", post: p })}
              />
            </li>
          ))}
        </ul>
      )}

      <ComposerModal target={composing} onClose={() => setComposing(null)} />
    </div>
  );
}
