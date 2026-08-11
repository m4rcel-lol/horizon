import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowLeftIcon } from "../icons";
import { useTheme } from "../theme";
import { useSession } from "../hooks/useSession";

const sections = [
  { to: "/settings/appearance", label: "Appearance", description: "Theme and display" },
  { to: "/settings/account", label: "Account", description: "Sessions and account switching" },
  { to: "/settings/privacy", label: "Privacy", description: "Visibility and interactions" },
];

export function SettingsPage() {
  const location = useLocation();
  const isIndex = location.pathname === "/settings" || location.pathname === "/settings/";

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
    </div>
  );
}

export function SettingsAccountPage() {
  const { accounts, active, switchAccount, logout, logoutAll } = useSession();

  return (
    <div className="px-4 py-4">
      <h2 className="text-[20px] font-extrabold mb-1">Account</h2>
      <p className="text-[14px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Switch between accounts on this device. Sessions are saved so you stay signed in after closing
        the browser. Passwords are never stored — only server-issued session tokens.
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
            const isActive = active?.userId === a.userId;
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
                    onClick={() => switchAccount(a.userId)}
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
  return (
    <div className="px-4 py-4">
      <h2 className="text-[20px] font-extrabold mb-1">Privacy</h2>
      <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
        Profile visibility, DM permissions, and mention controls will appear here once account privacy
        settings are connected to the API.
      </p>
    </div>
  );
}
