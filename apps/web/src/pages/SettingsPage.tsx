import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowLeftIcon } from "../icons";
import { useTheme } from "../theme";
import { useSession } from "../hooks/useSession";
import { PERMISSIONS } from "@horizon/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, NameWithBadges } from "../components/Verification";
import { api } from "../api";

const sections = [
  { to: "/settings/appearance", label: "Appearance", description: "Theme and display" },
  { to: "/settings/account", label: "Account", description: "Sessions and account switching" },
  { to: "/settings/privacy", label: "Privacy", description: "Visibility and interactions" },
  { to: "/settings/automation", label: "Automation", description: "Automated account management" },
];

/** Shown only to accounts that hold the matching permission. */
const adminSections = [
  {
    to: "/admin/settings",
    label: "Instance settings",
    description: "Storage, email and branding for this instance",
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
  {
    to: "/admin/verification",
    label: "Verification and affiliation",
    description: "Grant badges and manage organisations",
    permission: PERMISSIONS.VERIFICATION_GRANT,
  },
];

export function SettingsPage() {
  const location = useLocation();
  const { can } = useSession();
  const isIndex = location.pathname === "/settings" || location.pathname === "/settings/";
  const visibleAdminSections = adminSections.filter((s) => can(s.permission));

  return (
    <div>
      <header className="x-header gap-6">
        <Link to="/" className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="x-title">Settings</h1>
      </header>

      {isIndex ? (
        <nav className="divide-y" style={{ borderColor: "var(--color-border)" }} aria-label="Settings">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className="flex flex-col px-4 py-4 hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <span className="font-bold text-[15px]">{s.label}</span>
              <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                {s.description}
              </span>
            </NavLink>
          ))}

          {visibleAdminSections.length > 0 ? (
            <>
              <p
                className="px-4 pt-5 pb-2 text-[12px] font-bold uppercase tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Administration
              </p>
              {visibleAdminSections.map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  className="flex flex-col px-4 py-4 hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <span className="font-bold text-[15px]">{s.label}</span>
                  <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                    {s.description}
                  </span>
                </NavLink>
              ))}
            </>
          ) : null}
        </nav>
      ) : (
        <Outlet />
      )}
    </div>
  );
}

export function SettingsAppearancePage() {
  const { preference, setPreference, theme } = useTheme();

  return (
    <div className="px-4 py-4">
      <h2 className="text-[20px] font-extrabold mb-1">Appearance</h2>
      <p className="text-[14px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Choose how Horizon looks. System follows your device setting.
      </p>

      <fieldset className="space-y-2">
        <legend className="sr-only">Theme</legend>
        {(
          [
            { value: "light" as const, label: "Light", hint: "Always use light mode" },
            { value: "dark" as const, label: "Dark", hint: "Always use dark mode" },
            { value: "system" as const, label: "System", hint: "Match your device" },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer border"
            style={{
              borderColor: preference === opt.value ? "var(--color-primary)" : "var(--color-border)",
              background: preference === opt.value ? "var(--color-bg-secondary)" : "transparent",
            }}
          >
            <input
              type="radio"
              name="theme"
              value={opt.value}
              checked={preference === opt.value}
              onChange={() => setPreference(opt.value)}
              className="accent-[var(--color-primary)]"
            />
            <span className="flex-1">
              <span className="block font-bold text-[15px]">{opt.label}</span>
              <span className="block text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                {opt.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="mt-6 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        Currently showing: <strong style={{ color: "var(--color-text)" }}>{theme}</strong> theme
      </p>

      <h3 className="text-[17px] font-bold mt-8 mb-2">Accent colour</h3>
      <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Stored on this device — each account can pick a different accent.
      </p>
      <div className="flex flex-wrap gap-2">
        {["#1d9bf0", "#7856ff", "#00ba7c", "#f91880", "#ff7a00", "#e0245e"].map((color) => (
          <button
            key={color}
            type="button"
            className="w-10 h-10 rounded-full border-2"
            style={{
              background: color,
              borderColor:
                (typeof localStorage !== "undefined" && localStorage.getItem("horizon_accent") === color) ||
                (!localStorage.getItem("horizon_accent") && color === "#1d9bf0")
                  ? "var(--color-text)"
                  : "transparent",
            }}
            aria-label={`Accent ${color}`}
            onClick={() => {
              import("../theme").then(({ applyAccent }) => applyAccent(color));
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SettingsAccountPage() {
  const { accounts, active, logout, logoutAll, switchTo } = useSession();

  return (
    <div className="px-4 py-4">
      <h2 className="text-[20px] font-extrabold mb-1">Account</h2>
      <p className="text-[14px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Accounts you have used on this device. You stay signed in after closing the browser unless you
        turn that off when signing in. Switching asks for that account&apos;s password, because a
        session belongs to exactly one account — passwords are never stored on the device.
      </p>

      {accounts.length === 0 ? (
        <div className="empty-state !py-10">
          <h2>No saved accounts</h2>
          <p>
            <Link to="/login" className="link">
              Sign in
            </Link>{" "}
            and choose “Stay signed in” to add an account to this device.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => {
            const isActive = active?.id === a.userId;
            return (
              <li
                key={a.userId}
                className="flex items-center gap-3 px-3 py-3 rounded-xl border"
                style={{
                  borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                }}
              >
                <img
                  src={a.avatarUrl || "/assets/default-avatar.svg"}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-[var(--color-bg-secondary)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] truncate">{a.displayName}</p>
                  <p className="text-[13px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                    @{a.username}
                    {isActive ? " · Active" : ""}
                  </p>
                </div>
                {!isActive ? (
                  <button
                    type="button"
                    className="btn btn-outline text-[13px] !py-1.5 !px-3"
                    onClick={async () => {
                      try {
                        await switchTo(a.userId);
                        window.location.href = "/home";
                      } catch {
                        window.location.href = `/login?u=${encodeURIComponent(a.username)}`;
                      }
                    }}
                  >
                    Switch
                  </button>
                ) : null}
                <button type="button" className="text-[13px] link" onClick={() => logout(a.userId)}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/login" className="btn btn-primary text-[14px]">
          Add another account
        </Link>
        {accounts.length > 0 ? (
          <button type="button" className="btn btn-outline text-[14px]" onClick={() => logoutAll()}>
            Sign out of all accounts
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsPrivacyPage() {
  const { active, refresh } = useSession();
  const [isProtected, setIsProtected] = useState(Boolean(active?.isProtected));
  const [dmPermission, setDmPermission] = useState(
    () => localStorage.getItem("horizon_dm_permission") || "mutuals",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsProtected(Boolean(active?.isProtected));
  }, [active?.isProtected]);

  async function saveProtected(next: boolean) {
    if (!active?.username) return;
    setSaving(true);
    setMessage(null);
    try {
      const { api } = await import("../api");
      await api.updateUser(active.username, { isProtected: next });
      setIsProtected(next);
      await refresh();
      setMessage(next ? "Account is now private." : "Account is now public.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function saveDm(next: string) {
    setDmPermission(next);
    localStorage.setItem("horizon_dm_permission", next);
    setMessage("Message preference saved on this device.");
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-[20px] font-extrabold mb-1">Privacy</h2>
      <p className="text-[14px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Control who can follow you and who can message you.
      </p>

      <section className="mb-8">
        <h3 className="text-[17px] font-bold mb-2">Private account</h3>
        <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
          When enabled, new follows must be approved. Your profile posts stay hidden from people who
          do not follow you. Replies you leave on others&apos; posts remain visible.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isProtected}
            disabled={saving || !active}
            onChange={(e) => saveProtected(e.target.checked)}
            className="accent-[var(--color-primary)] w-5 h-5"
          />
          <span className="font-bold text-[15px]">Protect your posts</span>
        </label>
      </section>

      <FollowRequests />

      <BlockedAccounts />


      <section>
        <h3 className="text-[17px] font-bold mb-2">Who can message me</h3>
        <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Default is mutuals. Choosing nobody replaces the message button with a mention composer.
        </p>
        <fieldset className="space-y-2">
          {(
            [
              { value: "everyone", label: "Everyone", hint: "Anyone can send you a DM" },
              { value: "mutuals", label: "Mutuals", hint: "Only people you follow back" },
              { value: "following", label: "People you follow", hint: "Anyone you follow" },
              { value: "none", label: "Nobody", hint: "DMs off — message becomes a mention" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer border"
              style={{
                borderColor: dmPermission === opt.value ? "var(--color-primary)" : "var(--color-border)",
                background: dmPermission === opt.value ? "var(--color-bg-secondary)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="dm"
                value={opt.value}
                checked={dmPermission === opt.value}
                onChange={() => saveDm(opt.value)}
                className="accent-[var(--color-primary)]"
              />
              <span className="flex-1">
                <span className="block font-bold text-[15px]">{opt.label}</span>
                <span className="block text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      {message ? (
        <p className="mt-4 text-[14px]" style={{ color: "var(--color-text-secondary)" }} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}


export function SettingsAutomationPage() {
  const { active, refresh } = useSession();
  const [manager, setManager] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request() {
    if (!manager.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { api } = await import("../api");
      await api.requestAutomation(manager.trim().replace(/^@/, ""));
      await refresh();
      setMessage(`Request sent to @${manager.trim().replace(/^@/, "")}. They must accept before the automated label appears.`);
      setManager("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-[20px] font-extrabold mb-1">Automation</h2>
      <p className="text-[14px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Mark this account as automated by another person. They receive a request; after they accept,
        your profile shows a robot label and “Automated by @username”.
      </p>

      {active?.automatedBy && !active.automatedPending ? (
        <p className="mb-4 text-[15px] flex items-center gap-2">
          <span aria-hidden="true">🤖</span>
          Automated by{" "}
          <a href={`/${active.automatedBy.username}`} className="link font-bold">
            @{active.automatedBy.username}
          </a>
        </p>
      ) : null}

      {active?.automatedPending ? (
        <p className="mb-4 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
          Automation request pending acceptance.
        </p>
      ) : null}

      <label className="x-label" htmlFor="automation-manager">
        Manager username
      </label>
      <div className="flex gap-2">
        <input
          id="automation-manager"
          className="x-field flex-1"
          placeholder="username"
          value={manager}
          onChange={(e) => setManager(e.target.value)}
        />
        <button type="button" className="btn btn-primary" disabled={busy || !manager.trim()} onClick={request}>
          {busy ? "Sending…" : "Request"}
        </button>
      </div>
      {message ? (
        <p className="mt-3 text-[14px]" style={{ color: "var(--color-text-secondary)" }} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * People waiting to follow a private account.
 *
 * Lives with the privacy toggle that creates them: turning the account private
 * is what starts producing requests, so this is where you would look for them.
 * It renders nothing at all when there are none, rather than an empty box on
 * every public account's settings page.
 */
function FollowRequests() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["follow-requests"],
    queryFn: api.followRequests,
    retry: false,
  });

  const resolve = useMutation({
    mutationFn: ({ username, approve }: { username: string; approve: boolean }) =>
      api.resolveFollowRequest(username, approve),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["follow-list"] });
    },
  });

  const users = data?.users ?? [];
  if (isLoading || users.length === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="text-[17px] font-bold mb-2">
        Follow requests <span style={{ color: "var(--color-text-secondary)" }}>({users.length})</span>
      </h3>
      <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Approving one lets that account see your posts. Until then they see only what a stranger
        would.
      </p>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-2xl border p-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Avatar
              shape={u.avatarShape}
              size={40}
              src={u.avatarUrl || "/assets/default-avatar.svg"}
            />
            <div className="min-w-0 flex-1">
              <Link to={`/${u.username}`} className="font-bold hover:underline block truncate">
                <NameWithBadges
                  displayName={u.displayName}
                  verification={u.effectiveVerification}
                  badgeClassName="w-[15px] h-[15px]"
                />
              </Link>
              <span className="text-[14px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                @{u.username}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                className="btn btn-outline"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ username: u.username, approve: false })}
              >
                Decline
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ username: u.username, approve: true })}
              >
                Accept
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Accounts this user has blocked.
 *
 * Blocking happens from a profile, but undoing it there means finding the
 * profile again — so the list of them lives with the other privacy controls.
 * Hidden entirely when empty, like the follow requests above it.
 */
function BlockedAccounts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["blocks"],
    queryFn: api.blocks,
    retry: false,
  });

  const unblock = useMutation({
    mutationFn: (username: string) => api.setBlock(username, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
      queryClient.invalidateQueries({ queryKey: ["relationship"] });
    },
  });

  const users = data?.users ?? [];
  if (isLoading || users.length === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="text-[17px] font-bold mb-2">
        Blocked accounts <span style={{ color: "var(--color-text-secondary)" }}>({users.length})</span>
      </h3>
      <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
        They cannot follow you or interact with your posts. They can still read them.
      </p>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-2xl border p-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Avatar shape={u.avatarShape} size={40} src={u.avatarUrl || "/assets/default-avatar.svg"} />
            <div className="min-w-0 flex-1">
              <Link to={`/${u.username}`} className="font-bold hover:underline block truncate">
                <NameWithBadges
                  displayName={u.displayName}
                  verification={u.effectiveVerification}
                  badgeClassName="w-[15px] h-[15px]"
                />
              </Link>
              <span className="text-[14px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                @{u.username}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline shrink-0"
              disabled={unblock.isPending}
              onClick={() => unblock.mutate(u.username)}
            >
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
