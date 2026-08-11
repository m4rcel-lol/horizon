import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  ExploreIcon,
  NotificationsIcon,
  MessagesIcon,
  BookmarksIcon,
  ListsIcon,
  CommunitiesIcon,
  ProfileIcon,
  SettingsGearIcon,
  NoteIcon,
  SearchIcon,
  ComposeIcon,
} from "../icons";
import { useSession } from "../hooks/useSession";
import { PERMISSIONS } from "@horizon/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Avatar, NameWithBadges } from "./Verification";

/**
 * The destinations that stay on the bar; everything else is in the drawer.
 * Post sits in the middle, where a thumb reaches it, so it is listed here in
 * position rather than floating over the content.
 */
const bottomItems = [
  { to: "/home", label: "Home", icon: HomeIcon },
  { to: "/explore", label: "Search", icon: ExploreIcon },
  { to: "/home#composer", label: "Post", icon: ComposeIcon, primary: true },
  { to: "/notifications", label: "Notifications", icon: NotificationsIcon },
  { to: "/messages", label: "Messages", icon: MessagesIcon },
];

const drawerItems = [
  { to: "/profile", label: "Profile", icon: ProfileIcon },
  { to: "/bookmarks", label: "Bookmarks", icon: BookmarksIcon },
  { to: "/lists", label: "Lists", icon: ListsIcon },
  { to: "/communities", label: "Communities", icon: CommunitiesIcon },
  { to: "/notes", label: "Community Notes", icon: NoteIcon },
];

/**
 * Top bar for phones.
 *
 * The rail that holds the account, settings and the rest of the destinations is
 * desktop-only, so without this there is no way to reach any of them on a phone.
 * The avatar opens the drawer, which is where X puts the same thing.
 */
export function MobileTopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { active } = useSession();

  return (
    <header
      className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 border-b"
      style={{
        height: 53,
        borderColor: "var(--color-border)",
        background: "var(--color-scrim)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        onClick={onOpenDrawer}
        className="icon-btn -ml-1 shrink-0"
        style={{ width: 44, height: 44 }}
        aria-label={active ? `Account menu for @${active.username}` : "Menu"}
        aria-haspopup="dialog"
      >
        {active ? (
          <Avatar shape={active.avatarShape} size={32} src={active.avatarUrl ?? undefined} />
        ) : (
          <ProfileIcon className="w-6 h-6" />
        )}
      </button>

      <Link to="/" className="mx-auto" aria-label="Horizon home">
        <img src="/assets/logo.svg" alt="" className="w-7 h-7" />
      </Link>

      <Link
        to="/explore"
        className="icon-btn -mr-1 shrink-0"
        style={{ width: 44, height: 44 }}
        aria-label="Search"
      >
        <SearchIcon className="w-[22px] h-[22px]" />
      </Link>
    </header>
  );
}

/** Slide-in account and navigation drawer. */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { active, accounts, logout, isAuthenticated, can } = useSession();
  const canAdminister =
    can(PERMISSIONS.SETTINGS_VIEW) || can(PERMISSIONS.VERIFICATION_GRANT);
  const navigate = useNavigate();
  const location = useLocation();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Close on navigation, so tapping a link never leaves the drawer covering the page.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Keep tab focus inside the drawer while it is covering the page.
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        tabIndex={-1}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Account and navigation"
        className="absolute inset-y-0 left-0 w-[80%] max-w-[320px] overflow-y-auto flex flex-col"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-2">
            {active ? (
              <Link to={`/${active.username}`}>
                <Avatar shape={active.avatarShape} size={40} src={active.avatarUrl ?? undefined} />
              </Link>
            ) : (
              <img src="/assets/logo.svg" alt="" className="w-9 h-9" />
            )}
            <div className="flex items-center gap-1">
              {isAuthenticated ? (
                <Link
                  to="/settings/account"
                  className="icon-btn"
                  style={{ width: 44, height: 44 }}
                  aria-label="Switch account"
                  title="Switch account"
                >
                  <span aria-hidden="true" className="text-[18px] leading-none font-bold">
                    ⇄
                  </span>
                </Link>
              ) : null}
              <button
                ref={closeButton}
                type="button"
                onClick={onClose}
                className="icon-btn"
                style={{ width: 44, height: 44 }}
                aria-label="Close menu"
              >
                <span aria-hidden="true" className="text-[22px] leading-none">
                  ×
                </span>
              </button>
            </div>
          </div>

          {active ? (
            <div className="mt-3">
              <span className="font-bold text-[17px]">
                <NameWithBadges
                  displayName={active.displayName}
                  verification={active.effectiveVerification}
                  affiliatedTo={active.affiliatedTo}
                  nameHref={`/${active.username}`}
                />
              </span>
              <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                @{active.username}
              </p>
              <p className="mt-2 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                <strong style={{ color: "var(--color-text)" }}>{active.followingCount ?? 0}</strong> Following{" "}
                <strong style={{ color: "var(--color-text)" }}>{active.followersCount ?? 0}</strong> Followers
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="font-bold text-[17px]">You are signed out</p>
              <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                Sign in to post, reply and rate notes.
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-2" aria-label="More destinations">
          {drawerItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-5 px-4 text-[19px] font-bold ${isActive ? "" : ""}`
              }
              style={({ isActive }) => ({
                minHeight: 52,
                color: isActive ? "var(--color-primary)" : "var(--color-text)",
              })}
            >
              <Icon className="w-[26px] h-[26px] shrink-0" />
              {label}
            </NavLink>
          ))}

          <div className="my-2 border-t" style={{ borderColor: "var(--color-border)" }} />

          <Link
            to="/settings"
            className="flex items-center gap-5 px-4 text-[17px]"
            style={{ minHeight: 52 }}
          >
            <SettingsGearIcon className="w-[24px] h-[24px] shrink-0" />
            Settings and privacy
          </Link>
          {canAdminister ? (
            <Link
              to="/admin/settings"
              className="flex items-center gap-5 px-4 text-[17px] font-bold"
              style={{ minHeight: 52 }}
            >
              Admin Panel
            </Link>
          ) : null}
          {can(PERMISSIONS.VERIFICATION_GRANT) ? (
            <Link
              to="/admin/verification"
              className="flex items-center gap-5 px-4 text-[17px] font-bold"
              style={{ minHeight: 52 }}
            >
              Verification
            </Link>
          ) : null}

          {accounts.length > 0 ? (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              <p
                className="px-4 pb-1 text-[12px] font-bold uppercase tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Accounts on this device
              </p>
              {accounts.map((a) => (
                <Link
                  key={a.userId}
                  to={active?.id === a.userId ? `/${a.username}` : `/login?u=${encodeURIComponent(a.username)}`}
                  className="flex items-center gap-3 px-4"
                  style={{ minHeight: 52 }}
                >
                  <img
                    src={a.avatarUrl || "/assets/default-avatar.svg"}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold truncate">{a.displayName}</span>
                    <span
                      className="block text-[13px] truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      @{a.username}
                      {active?.id === a.userId ? " · Active" : " · Sign in to switch"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </nav>

        <div className="border-t px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
          {isAuthenticated ? (
            <button
              type="button"
              className="btn btn-outline w-full"
              style={{ minHeight: 44 }}
              onClick={async () => {
                await logout();
                onClose();
                navigate("/");
              }}
            >
              Log out {active ? `@${active.username}` : ""}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" className="btn btn-outline w-full" style={{ minHeight: 44 }}>
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary w-full" style={{ minHeight: 44 }}>
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bottom bar.
 *
 * Active state is carried by colour and a filled indicator rather than opacity
 * alone, which was failing contrast, and every target is at least 44px with the
 * bar padded for the home-indicator area on modern phones.
 */
export function MobileBottomNav() {
  const { isAuthenticated } = useSession();
  const { data: unread } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: api.unreadNotifications,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    retry: false,
  });
  const unreadCount = unread?.count ?? 0;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 flex justify-around items-stretch border-t z-40"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-bg)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Primary"
    >
      {bottomItems.map(({ to, label, icon: Icon, primary }) =>
        primary ? (
          // Post is an action rather than a destination, so it gets the filled
          // treatment and no active indicator.
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center justify-center flex-1"
            style={{ minHeight: 53, minWidth: 44 }}
            aria-label={label}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: 40,
                height: 40,
                background: "var(--color-btn)",
                color: "var(--color-btn-text)",
              }}
            >
              <Icon className="w-5 h-5" />
            </span>
          </Link>
        ) : (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center justify-center flex-1 relative"
            style={({ isActive }) => ({
              minHeight: 53,
              minWidth: 44,
              color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
            })}
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon className="w-[26px] h-[26px]" />
                  {to === "/notifications" && unreadCount > 0 ? (
                    <span
                      className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ background: "var(--color-primary)", color: "#fff" }}
                      aria-label={`${unreadCount} unread`}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </span>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-[3px] w-8 rounded-full"
                    style={{ background: "var(--color-primary)" }}
                  />
                ) : null}
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  );
}
