import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CommunitiesIcon } from "../icons";
import { api, type ApiCommunity } from "../api";
import { useSession } from "../hooks/useSession";

/** Icon, name, description and member count — the four things worth knowing. */
export function CommunityCard({
  community,
  showJoin = true,
}: {
  community: ApiCommunity;
  showJoin?: boolean;
}) {
  const { isAuthenticated } = useSession();
  const queryClient = useQueryClient();

  const membership = useMutation({
    mutationFn: (on: boolean) => api.setMembership(community.slug, on),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities"] }),
  });

  return (
    <div
      className="rounded-2xl border p-3 flex gap-3 items-start transition-colors hover:bg-[var(--color-row-hover)]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Link to={`/communities/${community.slug}`} className="shrink-0">
        {community.avatarUrl ? (
          <img
            src={community.avatarUrl}
            alt=""
            className="object-cover"
            style={{ width: 44, height: 44, borderRadius: 12 }}
          />
        ) : (
          <span
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-secondary)",
            }}
          >
            <CommunitiesIcon className="w-6 h-6" />
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link to={`/communities/${community.slug}`} className="font-bold text-[15px] hover:underline">
          {community.name}
        </Link>
        {community.description ? (
          <p className="text-[14px] mt-0.5 line-clamp-2">{community.description}</p>
        ) : null}
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          <strong style={{ color: "var(--color-text)" }}>{community.memberCount}</strong>{" "}
          {community.memberCount === 1 ? "member" : "members"} · run by{" "}
          <Link to={`/${community.owner.username}`} className="hover:underline">
            @{community.owner.username}
          </Link>
        </p>
      </div>

      {showJoin && isAuthenticated ? (
        <button
          type="button"
          className={`btn ${community.joinedByViewer ? "btn-outline" : "btn-primary"} shrink-0`}
          disabled={membership.isPending}
          onClick={() => membership.mutate(!community.joinedByViewer)}
        >
          {community.joinedByViewer ? "Leave" : "Join"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The communities pinned to a profile, under the follower counts.
 *
 * Nothing renders when the account belongs to none, rather than an empty
 * heading — a profile should not carry a label for something that is not there.
 */
export function ProfileCommunities({ username }: { username: string }) {
  const { data } = useQuery({
    queryKey: ["communities", "user", username],
    queryFn: () => api.communitiesFor(username),
    enabled: Boolean(username),
    retry: false,
  });
  const communities = data?.communities ?? [];
  if (communities.length === 0) return null;

  return (
    <section className="mt-3 animate-fade-in" aria-label="Communities">
      <h2
        className="text-[13px] font-bold uppercase tracking-wide mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {communities.length === 1 ? "Community" : "Communities"}
      </h2>
      <div className="flex flex-col gap-2">
        {communities.slice(0, 3).map((c) => (
          <CommunityCard key={c.id} community={c} showJoin={false} />
        ))}
      </div>
    </section>
  );
}
