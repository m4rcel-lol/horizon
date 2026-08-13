import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api } from "../api";
import { PostCard } from "../components/PostCard";
import { PageLoader } from "../components/LoadingSpinner";

/**
 * Posts that mention a hashtag. Matching is plain substring search on content
 * until a dedicated hashtag index exists.
 */
export function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const normalized = (tag ?? "").replace(/^#/, "");

  const { data, isLoading } = useQuery({
    queryKey: ["hashtag", normalized],
    queryFn: () => api.listPosts(),
    enabled: Boolean(normalized),
  });

  const posts = (data?.posts ?? []).filter((p) =>
    new RegExp(`#${normalized}\\b`, "i").test(p.content),
  );

  return (
    <div className="animate-page">
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="x-title truncate">#{normalized}</h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {posts.length} post{posts.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {isLoading ? (
        <PageLoader label="Loading…" />
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h2>No posts yet</h2>
          <p>When people use #{normalized}, they show up here.</p>
        </div>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
