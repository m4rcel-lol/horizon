import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { DailyBars, StatGroup, StatTile } from "../components/StatBars";
import { PageLoader } from "../components/LoadingSpinner";

/** Instance-wide numbers. */
export function AdminStatisticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["instance-stats"],
    queryFn: api.instanceStats,
    retry: false,
  });

  if (isLoading) return <PageLoader label="Counting…" />;
  if (error || !data) {
    return (
      <div className="empty-state">
        <h2>Could not load statistics</h2>
        <p>This page needs the users.view permission.</p>
      </div>
    );
  }

  const s = data.stats;
  return (
    <div className="animate-fade-in">
      <DailyBars data={s.daily} label="Posts per day, last 14 days" />

      <StatGroup title="Accounts">
        <StatTile label="Total" value={s.accounts.total} />
        <StatTile label="Active" value={s.accounts.active} />
        <StatTile label="Suspended" value={s.accounts.suspended} />
        <StatTile label="Verified" value={s.accounts.verified} />
        <StatTile label="System" value={s.accounts.system} hint="run by the instance" />
        <StatTile label="New this week" value={s.recent.accounts} />
      </StatGroup>

      <StatGroup title="Posts">
        <StatTile label="Live" value={s.posts.total} />
        <StatTile label="Original" value={s.posts.original} />
        <StatTile label="Replies" value={s.posts.replies} />
        <StatTile label="Quotes" value={s.posts.quotes} />
        <StatTile label="Deleted" value={s.posts.deleted} hint="soft-deleted, still stored" />
        <StatTile label="New this week" value={s.recent.posts} />
      </StatGroup>

      <StatGroup title="Engagement">
        <StatTile label="Likes" value={s.engagement.likes} />
        <StatTile label="Reposts" value={s.engagement.reposts} />
        <StatTile label="Bookmarks" value={s.engagement.bookmarks} />
        <StatTile label="Follows" value={s.engagement.follows} />
      </StatGroup>

      <StatGroup title="Community Notes">
        <StatTile label="Written" value={s.notes.total} />
        <StatTile label="Rated helpful" value={s.notes.helpful} hint="shown on the post" />
        <StatTile label="Rated unhelpful" value={s.notes.notHelpful} />
        <StatTile label="Awaiting ratings" value={s.notes.pending} />
      </StatGroup>

      <StatGroup title="Communities">
        <StatTile label="Communities" value={s.communities.total} />
        <StatTile label="Memberships" value={s.communities.members} />
      </StatGroup>

      <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        Counted from the rows themselves each time this page loads, rather than from a stored
        rollup that could drift from what it summarises.
      </p>
    </div>
  );
}
