import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "../icons";
import { PERMISSIONS } from "@horizon/shared";
import { useSession } from "../hooks/useSession";

const sections = [
  { to: "/admin", label: "Overview", end: true, permission: PERMISSIONS.USERS_VIEW },
  { to: "/admin/users", label: "Users", permission: PERMISSIONS.USERS_VIEW },
  { to: "/admin/statistics", label: "Statistics", permission: PERMISSIONS.USERS_VIEW },
  { to: "/admin/verification", label: "Verification", permission: PERMISSIONS.VERIFICATION_GRANT },
  { to: "/admin/notes", label: "Community Notes", permission: PERMISSIONS.MODERATION_MANAGE },
  { to: "/admin/settings", label: "Instance settings", permission: PERMISSIONS.SETTINGS_VIEW },
] as const;

/**
 * The frame around every admin page.
 *
 * The admin pages used to be islands: no navigation between them, and no way
 * out except the browser's back button — which does not help if you arrived by
 * typing the URL. This gives them a shared header with a way back, a way out,
 * and a list of the other pages.
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const { can, active } = useSession();
  const visible = sections.filter((s) => can(s.permission));

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[1000px] px-4 py-4">
        <header
          className="flex items-center gap-3 flex-wrap pb-3 mb-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="icon-btn border"
            style={{ borderColor: "var(--color-border-strong)" }}
            aria-label="Back"
            title="Back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold leading-6">Administration</h1>
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              {active ? `Signed in as @${active.username}` : "Instance administration"}
            </p>
          </div>

          {/* An explicit way out, because the admin pages are outside the app
              shell and otherwise have no route back into it. */}
          <Link to="/home" className="btn btn-outline ml-auto">
            Exit admin
          </Link>
        </header>

        <nav
          className="flex gap-1 flex-wrap mb-5 overflow-x-auto"
          aria-label="Administration sections"
        >
          {visible.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={"end" in s ? s.end : undefined}
              className="px-3 py-2 rounded-full text-[15px] font-bold whitespace-nowrap transition-colors"
              style={({ isActive }) => ({
                background: isActive ? "var(--color-primary)" : "var(--color-bg-secondary)",
                color: isActive ? "#fff" : "var(--color-text)",
              })}
            >
              {s.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
