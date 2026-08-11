import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CommunitiesIcon } from "../icons";
import { api, ApiError } from "../api";
import { CommunityCard } from "../components/CommunityCard";
import { PageLoader } from "../components/LoadingSpinner";
import { useSession } from "../hooks/useSession";

export function CommunitiesPage() {
  const { active, isAuthenticated } = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["communities"],
    queryFn: api.communities,
  });
  const communities = data?.communities ?? [];

  // Verified on their own merits, or through an affiliation — the same rule
  // the API applies, so the form is only offered where it would succeed.
  const canCreate =
    Boolean(active) &&
    !active?.isSystem &&
    (active?.verification !== "NONE" || Boolean(active?.affiliatedTo));

  const create = useMutation({
    mutationFn: () => api.createCommunity({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      setCreating(false);
      setName("");
      setDescription("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not create that community."),
  });

  return (
    <div>
      <header className="x-header justify-between">
        <h1 className="x-title">Communities</h1>
        {canCreate ? (
          <button type="button" className="btn btn-primary" onClick={() => setCreating((c) => !c)}>
            {creating ? "Cancel" : "Create"}
          </button>
        ) : null}
      </header>

      {creating ? (
        <div
          className="px-4 py-4 border-b animate-pop-in"
          style={{ borderColor: "var(--color-border)" }}
        >
          <label htmlFor="community-name" className="x-label">
            Name
          </label>
          <input
            id="community-name"
            className="x-field"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="mt-3">
            <label htmlFor="community-description" className="x-label">
              What it is for
            </label>
            <textarea
              id="community-description"
              className="x-field min-h-[80px] resize-y"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-[14px]" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          ) : null}
          <div className="flex justify-end mt-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={name.trim().length < 3 || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create community"}
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <PageLoader label="Loading communities…" />
      ) : communities.length === 0 ? (
        <div className="empty-state">
          <h2>No communities yet</h2>
          <p className="mb-6">
            Communities are spaces built around a shared interest.{" "}
            {canCreate
              ? "You are verified, so you can start one."
              : isAuthenticated
                ? "Verified accounts can create them — an unverified instance fills up with squatted names."
                : "Sign in with a verified account to create one."}
          </p>
          {canCreate ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setCreating(true)}>
              Create a community
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3 p-4">
          {communities.map((c) => (
            <li key={c.id}>
              <CommunityCard community={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One community in full. */
export function CommunityPage() {
  const { slug = "" } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSession();

  const { data, isLoading, error } = useQuery({
    queryKey: ["communities", slug],
    queryFn: () => api.community(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const membership = useMutation({
    mutationFn: (on: boolean) => api.setMembership(slug, on),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities"] }),
  });

  const missing = error instanceof ApiError && error.status === 404;
  const community = data?.community;

  return (
    <div>
      <header className="x-header gap-6">
        <Link to="/communities" className="icon-btn -ml-2" aria-label="Back to communities">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="x-title truncate">{community?.name ?? "Community"}</h1>
      </header>

      {isLoading ? (
        <PageLoader label="Loading…" />
      ) : missing || !community ? (
        <div className="empty-state">
          <h2>No such community</h2>
          <p>It may have been renamed, or the link may be wrong.</p>
        </div>
      ) : (
        <div className="px-4 py-4 animate-fade-in">
          <div className="flex gap-4 items-start">
            {community.avatarUrl ? (
              <img
                src={community.avatarUrl}
                alt=""
                className="object-cover shrink-0"
                style={{ width: 72, height: 72, borderRadius: 18 }}
              />
            ) : (
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <CommunitiesIcon className="w-9 h-9" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-extrabold leading-7">{community.name}</h2>
              <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                <strong style={{ color: "var(--color-text)" }}>{community.memberCount}</strong>{" "}
                {community.memberCount === 1 ? "member" : "members"} · run by{" "}
                <Link to={`/${community.owner.username}`} className="link">
                  @{community.owner.username}
                </Link>
              </p>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                className={`btn ${community.joinedByViewer ? "btn-outline" : "btn-primary"}`}
                disabled={membership.isPending}
                onClick={() => membership.mutate(!community.joinedByViewer)}
              >
                {community.joinedByViewer ? "Leave" : "Join"}
              </button>
            ) : null}
          </div>

          {community.description ? (
            <p className="mt-4 text-[15px]">{community.description}</p>
          ) : null}

          <div className="empty-state mt-6">
            <h2>No posts in this community yet</h2>
            <p>
              Posting into a community is not built yet — membership and discovery are. Posts made
              here will appear in this space when it lands.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
