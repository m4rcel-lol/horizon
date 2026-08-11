import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@horizon/shared";
import { api } from "../api";
import { useSession } from "../hooks/useSession";

const cards = [
  {
    to: "/admin/statistics",
    title: "Statistics",
    body: "Accounts, posts, engagement and Community Notes across the whole instance.",
    permission: PERMISSIONS.USERS_VIEW,
  },
  {
    to: "/admin/verification",
    title: "Verification and affiliation",
    body: "Grant and revoke badges, and manage which organisations vouch for whom.",
    permission: PERMISSIONS.VERIFICATION_GRANT,
  },
  {
    to: "/admin/notes",
    title: "Community Notes",
    body: "Write a note on any post, and see how readers have rated the existing ones.",
    permission: PERMISSIONS.MODERATION_MANAGE,
  },
  {
    to: "/admin/settings",
    title: "Instance settings",
    body: "Branding, object storage and outbound email for this instance.",
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
] as const;

/** The landing page of the admin area: what is here, and the headline numbers. */
export function AdminOverviewPage() {
  const { can } = useSession();
  const { data } = useQuery({
    queryKey: ["instance-stats"],
    queryFn: api.instanceStats,
    enabled: can(PERMISSIONS.USERS_VIEW),
    retry: false,
  });
  const stats = data?.stats;

  return (
    <div className="animate-fade-in">
      {stats ? (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {[
            { label: "Accounts", value: stats.accounts.total },
            { label: "Posts", value: stats.posts.total },
            { label: "Follows", value: stats.engagement.follows },
            { label: "Notes", value: stats.notes.total },
            { label: "New this week", value: stats.recent.posts, hint: "posts" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                {s.label}
              </p>
              <p className="text-[26px] font-extrabold tabular-nums leading-8">{s.value}</p>
              {s.hint ? (
                <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                  {s.hint}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {cards
          .filter((c) => can(c.permission))
          .map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="rounded-2xl border p-4 transition-colors hover:bg-[var(--color-bg-secondary)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              <h2 className="text-[17px] font-extrabold">{c.title}</h2>
              <p className="text-[14px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
                {c.body}
              </p>
            </Link>
          ))}
      </div>

      <p className="mt-6 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        Sections you do not have permission for are not listed. Everything here is checked again on
        the server.
      </p>
    </div>
  );
}
