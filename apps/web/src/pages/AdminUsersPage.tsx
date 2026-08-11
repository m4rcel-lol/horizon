import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS, VERIFICATION_TYPES, type VerificationType } from "@horizon/shared";
import { api, ApiError, type ApiUser } from "../api";
import { Avatar, NameWithBadges } from "../components/Verification";
import { useSession } from "../hooks/useSession";
import { PageLoader } from "../components/LoadingSpinner";

type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";

/**
 * User management.
 *
 * The public directory endpoint returns every account in one unbounded
 * response, which is why this page has its own: an instance with more than a
 * few hundred accounts cannot be moderated by scrolling a single list, and
 * search does not belong on a route anonymous callers can hit.
 *
 * Every control here is also enforced server-side by permission, so an account
 * that can see the page but not suspend gets a 403 rather than a broken row —
 * the buttons are hidden as a courtesy, not as the protection.
 */
export function AdminUsersPage() {
  const { can, active } = useSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", committed, status, page],
    queryFn: () => api.adminSearchUsers({ q: committed, status, page }),
    enabled: can(PERMISSIONS.USERS_VIEW),
    retry: false,
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 25;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["instance-stats"] });
  };
  const onError = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : "That did not work.");

  const setStatusFor = useMutation({
    mutationFn: ({
      username,
      next,
      reason,
      durationMinutes,
    }: {
      username: string;
      next: "ACTIVE" | "SUSPENDED";
      reason?: string;
      durationMinutes?: number;
    }) => api.setUserStatus(username, next, { reason, durationMinutes }),
    onSuccess: refresh,
    onError,
  });

  const rename = useMutation({
    mutationFn: ({ username, next }: { username: string; next: string }) =>
      api.setUsername(username, next),
    onSuccess: refresh,
    onError,
  });

  const setVerification = useMutation({
    mutationFn: ({ username, type }: { username: string; type: VerificationType }) =>
      api.setVerification(username, type),
    onSuccess: refresh,
    onError,
  });

  return (
    <div className="animate-fade-in">
      <form
        className="flex flex-wrap gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setCommitted(query.trim());
        }}
      >
        <input
          className="x-field flex-1 min-w-[200px]"
          placeholder="Search by handle or display name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search accounts"
        />
        <select
          className="x-field w-auto"
          value={status}
          aria-label="Filter by status"
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as StatusFilter);
          }}
        >
          <option value="ALL">All accounts</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {error ? (
        <p role="alert" className="mb-3 text-[14px]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <PageLoader label="Loading accounts…" />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h2>No accounts match</h2>
          <p>Try a different search or clear the filter.</p>
        </div>
      ) : (
        <>
          <p className="text-[13px] mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {total} account{total === 1 ? "" : "s"} · page {data?.page ?? 1} of {pages}
          </p>
          <ul className="flex flex-col gap-2">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={active?.username === u.username}
                open={expanded === u.id}
                onToggle={() => setExpanded(expanded === u.id ? null : u.id)}
                busy={setStatusFor.isPending || setVerification.isPending || rename.isPending}
                onSuspend={(next, reason, durationMinutes) => {
                  setError(null);
                  setStatusFor.mutate({ username: u.username, next, reason, durationMinutes });
                }}
                onRename={(next) => {
                  setError(null);
                  rename.mutate({ username: u.username, next });
                }}
                onVerify={(type) => {
                  setError(null);
                  setVerification.mutate({ username: u.username, type });
                }}
              />
            ))}
          </ul>

          {pages > 1 ? (
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                {page} / {pages}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * One account, with its actions behind a disclosure.
 *
 * Suspending and changing a badge are both consequential, so they are one tap
 * away rather than sitting under the cursor on every row of a long list.
 */
function UserRow({
  user,
  isSelf,
  open,
  onToggle,
  busy,
  onSuspend,
  onVerify,
  onRename,
}: {
  user: ApiUser;
  isSelf: boolean;
  open: boolean;
  onToggle: () => void;
  busy: boolean;
  onSuspend: (next: "ACTIVE" | "SUSPENDED", reason?: string, durationMinutes?: number) => void;
  onVerify: (type: VerificationType) => void;
  onRename: (next: string) => void;
}) {
  const { can } = useSession();
  const suspended = user.status === "SUSPENDED";
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("0");
  const [handle, setHandle] = useState(user.username);

  return (
    <li className="rounded-2xl border" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center gap-3 p-3">
        <Avatar shape={user.avatarShape} size={40} src={user.avatarUrl || "/assets/default-avatar.svg"} />
        <div className="min-w-0 flex-1">
          <span className="font-bold block truncate">
            <NameWithBadges
              displayName={user.displayName}
              verification={user.effectiveVerification}
              affiliatedTo={user.affiliatedTo}
              nameHref={`/${user.username}`}
              badgeClassName="w-[15px] h-[15px]"
              isProtected={user.isProtected}
              isAutomated={Boolean(user.automatedBy) && !user.automatedPending}
            />
          </span>
          <span className="text-[13px] block truncate" style={{ color: "var(--color-text-secondary)" }}>
            @{user.username} · joined {new Date(user.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {suspended ? (
            <span
              className="text-[12px] font-bold px-2 py-1 rounded-full"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-danger, #f91880)" }}
            >
              Suspended
            </span>
          ) : null}
          {user.isSystem ? (
            <span
              className="text-[12px] font-bold px-2 py-1 rounded-full"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}
            >
              System
            </span>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={onToggle} aria-expanded={open}>
            {open ? "Close" : "Manage"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t px-3 py-3 flex flex-wrap gap-4" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              Account
            </span>
            <div className="flex gap-2 flex-wrap">
              <Link to={`/${user.username}`} className="btn btn-outline">
                View profile
              </Link>
              <Link to={`/${user.username}/stats`} className="btn btn-outline">
                Statistics
              </Link>
              {can(PERMISSIONS.USERS_SUSPEND) ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  // A system account refuses server-side, and suspending
                  // yourself would lock you out of the page you are on.
                  disabled={busy || user.isSystem || isSelf}
                  title={
                    user.isSystem
                      ? "System accounts cannot be suspended"
                      : isSelf
                        ? "You cannot suspend your own account"
                        : undefined
                  }
                  style={suspended ? undefined : { color: "var(--color-danger, #f91880)" }}
                  onClick={() =>
                    suspended ? onSuspend("ACTIVE") : setSuspending((v) => !v)
                  }
                >
                  {suspended ? "Restore" : "Suspend"}
                </button>
              ) : null}
            </div>
          </div>

          {can(PERMISSIONS.MODERATION_MANAGE) && !user.isSystem ? (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                Username
              </span>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  onRename(handle.trim());
                }}
              >
                <input
                  className="x-field w-[180px]"
                  value={handle}
                  maxLength={20}
                  aria-label={`Username for @${user.username}`}
                  onChange={(e) => setHandle(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-outline"
                  disabled={busy || handle.trim() === user.username || handle.trim().length < 3}
                >
                  Rename
                </button>
              </form>
            </div>
          ) : null}

          {can(PERMISSIONS.VERIFICATION_GRANT) ? (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                Verification
              </span>
              <select
                className="x-field w-auto"
                value={user.verification}
                disabled={busy || user.isSystem}
                aria-label={`Verification for @${user.username}`}
                onChange={(e) => onVerify(e.target.value as VerificationType)}
              >
                {VERIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "NONE" ? "Not verified" : t}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {open && suspending && !suspended ? (
        <form
          className="border-t px-3 py-3 flex flex-wrap gap-2 items-end"
          style={{ borderColor: "var(--color-border)" }}
          onSubmit={(e) => {
            e.preventDefault();
            onSuspend("SUSPENDED", reason.trim() || undefined, Number(duration) || undefined);
            setSuspending(false);
            setReason("");
          }}
        >
          <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              Reason (shown to them)
            </span>
            <input
              className="x-field"
              value={reason}
              maxLength={280}
              placeholder="Why this account is being suspended"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              Duration
            </span>
            <select className="x-field w-auto" value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="0">Until lifted</option>
              <option value="1440">24 hours</option>
              <option value="10080">7 days</option>
              <option value="43200">30 days</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Confirm suspension
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setSuspending(false)}>
            Cancel
          </button>
        </form>
      ) : null}

      {suspended && user.suspension ? (
        <p
          className="border-t px-3 py-2 text-[13px]"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          Suspended{user.suspension.since ? ` on ${new Date(user.suspension.since).toLocaleDateString()}` : ""}
          {user.suspension.until
            ? `, lifting ${new Date(user.suspension.until).toLocaleString()}`
            : ", until lifted"}
          {user.suspension.reason ? ` — ${user.suspension.reason}` : ""}
        </p>
      ) : null}
    </li>
  );
}
