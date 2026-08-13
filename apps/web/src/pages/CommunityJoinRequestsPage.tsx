import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api, ApiError } from "../api";
import { PageLoader } from "../components/LoadingSpinner";
import { useSession } from "../hooks/useSession";

/**
 * Owner-only inbox of people who asked to join a REQUEST-mode community.
 * Approve adds them as a member; decline deletes the request so it never happened.
 */
export function CommunityJoinRequestsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["community-join-requests", slug],
    queryFn: () => api.communityJoinRequests(slug!),
    enabled: Boolean(slug) && isAuthenticated,
    retry: false,
  });

  const resolve = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.resolveCommunityJoinRequest(slug!, id, approve),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-join-requests", slug] });
      qc.invalidateQueries({ queryKey: ["community", slug] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const requests = data?.requests ?? [];
  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <div className="animate-page">
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="x-title truncate">Join requests</h1>
          {slug ? (
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              <Link to={`/communities/${slug}`} className="link">
                c/{slug}
              </Link>
            </p>
          ) : null}
        </div>
      </header>

      {!isAuthenticated ? (
        <div className="empty-state">
          <h2>Sign in</h2>
          <p>You need to be signed in to review join requests.</p>
        </div>
      ) : isLoading ? (
        <PageLoader label="Loading requests…" />
      ) : forbidden ? (
        <div className="empty-state">
          <h2>Not allowed</h2>
          <p>Only the community owner can review join requests.</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <h2>No pending requests</h2>
          <p>When someone asks to join, they will show up here.</p>
        </div>
      ) : (
        <ul>
          {requests.map((req) => (
            <li
              key={req.id}
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Link to={`/${req.user.username}`}>
                <img
                  src={req.user.avatarUrl || "/assets/default-avatar.svg"}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                  style={{ background: "var(--color-bg-secondary)" }}
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/${req.user.username}`} className="font-bold text-[15px] hover:underline">
                  {req.user.displayName}
                </Link>
                <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                  @{req.user.username}
                </p>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  Requested {new Date(req.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  className="btn btn-outline text-[13px] !py-1.5 !px-3"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: req.id, approve: false })}
                >
                  Decline
                </button>
                <button
                  type="button"
                  className="btn btn-primary text-[13px] !py-1.5 !px-3"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: req.id, approve: true })}
                >
                  Approve
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
