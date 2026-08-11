import { Link, NavLink, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api } from "../api";
import { Avatar, NameWithBadges } from "../components/Verification";
import { FollowButton } from "../components/FollowButton";
import { PageLoader } from "../components/LoadingSpinner";

/** Who follows an account, and who it follows. */
export function FollowListPage({ mode }: { mode: "followers" | "following" }) {
  const { username = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["follow-list", mode, username],
    queryFn: () => (mode === "followers" ? api.followers(username) : api.followingList(username)),
    enabled: Boolean(username),
    retry: false,
  });
  const users = data?.users ?? [];

  return (
    <div>
      <header className="x-header gap-6">
        <Link to={`/${username}`} className="icon-btn -ml-2" aria-label="Back to profile">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="x-title truncate">@{username}</h1>
        </div>
      </header>

      <div className="x-tabs sticky top-[53px] z-10" aria-label="Follows">
        <NavLink to={`/${username}/followers`} className="x-tab" aria-selected={mode === "followers"}>
          Followers
        </NavLink>
        <NavLink to={`/${username}/following`} className="x-tab" aria-selected={mode === "following"}>
          Following
        </NavLink>
      </div>

      {isLoading ? (
        <PageLoader label="Loading…" />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h2>{mode === "followers" ? "No followers yet" : "Not following anyone yet"}</h2>
          <p>
            {mode === "followers"
              ? `When someone follows @${username}, they appear here.`
              : `Accounts @${username} follows appear here.`}
          </p>
        </div>
      ) : (
        <ul>
          {users.map((u) => (
            <li
              key={u.id}
              className="flex gap-3 px-4 py-3 border-b items-start"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Link to={`/${u.username}`} className="shrink-0">
                <Avatar
                  shape={u.avatarShape}
                  size={44}
                  src={u.avatarUrl || "/assets/default-avatar.svg"}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/${u.username}`} className="block font-bold text-[15px] hover:underline">
                  <NameWithBadges
                    displayName={u.displayName}
                    verification={u.effectiveVerification}
                    affiliatedTo={u.affiliatedTo}
                    badgeClassName="w-[16px] h-[16px]"
                  />
                </Link>
                <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
                  @{u.username}
                </p>
                {u.bio ? <p className="mt-1 text-[15px]">{u.bio}</p> : null}
              </div>
              <FollowButton username={u.username} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
