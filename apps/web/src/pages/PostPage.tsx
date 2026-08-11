import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api, ApiError } from "../api";
import { PostCard } from "../components/PostCard";

export function PostPage() {
  const { username, postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => api.getPost(postId ?? ""),
    enabled: Boolean(postId),
    retry: false,
  });

  const rate = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      api.rateNote(id, helpful),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const post = data?.post;
  const missing = error instanceof ApiError && error.status === 404;

  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">Post</h1>
      </header>

      {isLoading ? (
        <p className="px-4 py-6 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Loading post…
        </p>
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
          <PostCard
            post={post}
            detail
            ratingNote={rate.isPending}
            onRateNote={(id, helpful) => rate.mutate({ id, helpful })}
          />
          {post.notes.length > 0 ? (
            <p className="px-4 py-2 text-[13px]">
              <Link to="/notes" className="link">
                About Community Notes
              </Link>
            </p>
          ) : null}
          <div className="empty-state">
            <h2>No replies yet</h2>
            <p>Replies to this post will appear here in the order they were sent.</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
