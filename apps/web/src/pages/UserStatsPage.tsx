import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api, ApiError } from "../api";
import { DailyBars, StatGroup, StatTile } from "../components/StatBars";
import { PageLoader } from "../components/LoadingSpinner";

/**
 * One account's numbers.
 *
 * Public, because everything here can already be counted off the profile —
 * hiding the totals would be a pretence rather than a privacy measure.
 */
export function UserStatsPage() {
  const { username = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-stats", username],
    queryFn: () => api.userStats(username),
    enabled: Boolean(username),
    retry: false,
  });

  const missing = error instanceof ApiError && error.status === 404;

  return (
    <div className="animate-fade-in">
      <header className="x-header gap-6">
        <Link to={`/${username}`} className="icon-btn -ml-2" aria-label="Back to profile">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="x-title truncate">Statistics</h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            @{username}
          </p>
        </div>
      </header>

      {isLoading ? (
        <PageLoader label="Counting…" />
      ) : missing || !data ? (
        <div className="empty-state">
          <h2>This account doesn&apos;t exist</h2>
          <p>Nothing to count.</p>
        </div>
      ) : (
        <div className="px-4 py-4">
          <DailyBars data={data.stats.daily} label="Posts per day, last 14 days" />

          <StatGroup title="Written">
            <StatTile label="Posts" value={data.stats.posts.total} />
            <StatTile label="Original" value={data.stats.posts.original} />
            <StatTile label="Replies" value={data.stats.posts.replies} />
            <StatTile label="Quotes" value={data.stats.posts.quotes} />
          </StatGroup>

          <StatGroup title="Received">
            <StatTile label="Likes" value={data.stats.received.likes} />
            <StatTile label="Reposts" value={data.stats.received.reposts} />
            <StatTile label="Replies" value={data.stats.received.replies} />
          </StatGroup>

          <StatGroup title="Given">
            <StatTile label="Likes" value={data.stats.given.likes} />
            <StatTile label="Reposts" value={data.stats.given.reposts} />
          </StatGroup>

          <StatGroup title="Audience">
            <StatTile label="Followers" value={data.stats.audience.followers} />
            <StatTile label="Following" value={data.stats.audience.following} />
          </StatGroup>

          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            Joined {new Date(data.stats.joinedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            .
          </p>
        </div>
      )}
    </div>
  );
}
