import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  ExploreIcon,
  NotificationsIcon,
  MessagesIcon,
  BookmarksIcon,
  ListsIcon,
  CommunitiesIcon,
  ProfileIcon,
  MoreIcon,
  SearchIcon,
  ComposeIcon,
  SettingsIcon,
} from "../icons";
import { useSession } from "../hooks/useSession";
import { MobileTopBar, MobileDrawer, MobileBottomNav } from "../components/MobileNav";
import { PERMISSIONS } from "@horizon/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

const navItems = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/explore", label: "Explore", icon: ExploreIcon },
  { to: "/notifications", label: "Notifications", icon: NotificationsIcon },
  { to: "/messages", label: "Messages", icon: MessagesIcon },
  { to: "/bookmarks", label: "Bookmarks", icon: BookmarksIcon },
  { to: "/lists", label: "Lists", icon: ListsIcon },
  { to: "/communities", label: "Communities", icon: CommunitiesIcon },
  { to: "/profile", label: "Profile", icon: ProfileIcon },
];

/** Roughly what the More menu occupies; used only to choose a direction. */
const MORE_MENU_HEIGHT = 360;

export function MainLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /**
   * The More menu opens downward. On a short window there may not be room, and
   * a menu running off the bottom of the screen is unusable — so it flips up
   * only when it genuinely does not fit and there is more space above.
   */
  const [moreDropsUp, setMoreDropsUp] = useState(false);
  const [search, setSearch] = useState("");
  const moreRef = useRef<HTMLLIElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { accounts, active, logout, isAuthenticated, can } = useSession();
  // Driven by the caller's own permissions, which only ever describe them —
  // the public user object must not say who the administrators are.
  const canAdminister =
    can(PERMISSIONS.SETTINGS_VIEW) || can(PERMISSIONS.VERIFICATION_GRANT);

  // One count, polled while the tab is open, so the badge is current without
  // loading the notifications themselves.
  const { data: unread } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: api.unreadNotifications,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    retry: false,
  });
  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[1290px] flex">
        <div className="hidden md:flex flex-col items-end xl:items-stretch w-[88px] xl:w-[275px] shrink-0 px-1 xl:px-3 sticky top-0 h-screen">
          <nav className="flex flex-col h-full py-1" aria-label="Main">
            <Link
              to="/"
              className="icon-btn !w-[50px] !h-[50px] my-0.5 self-start xl:ml-1"
              aria-label="Horizon home"
            >
              <img src="/assets/logo.svg" alt="" className="w-8 h-8" />
            </Link>

            <ul className="flex flex-col gap-0.5 mt-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => `nav-item ${isActive ? "font-bold" : "font-normal"}`}
                  >
                    <span className="relative shrink-0">
                      <Icon className="w-[26.25px] h-[26.25px]" />
                      {to === "/notifications" && unreadCount > 0 ? (
                        <span
                          className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center"
                          style={{ background: "var(--color-primary)", color: "#fff" }}
                          aria-label={`${unreadCount} unread`}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="hidden xl:inline pr-4">{label}</span>
                  </NavLink>
                </li>
              ))}
              <li className="relative" ref={moreRef}>
                <button
                  type="button"
                  className="nav-item w-full"
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  onClick={() => {
                    // Decide the direction from where the button actually is,
                    // before the menu renders.
                    const rect = moreRef.current?.getBoundingClientRect();
                    if (rect) {
                      const below = window.innerHeight - rect.bottom;
                      setMoreDropsUp(below < MORE_MENU_HEIGHT && rect.top > below);
                    }
                    setMoreOpen((o) => !o);
                  }}
                >
                  <MoreIcon className="w-[26.25px] h-[26.25px] shrink-0" />
                  <span className="hidden xl:inline pr-4">More</span>
                </button>

                {moreOpen ? (
                  <div
                    role="menu"
                    className={`absolute left-0 w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-xl z-50 overflow-hidden ${
                      moreDropsUp ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
                    style={{
                      background: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                      boxShadow: "0 0 15px rgba(0,0,0,0.2)",
                    }}
                  >
                    <Link
                      role="menuitem"
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px] font-bold"
                      onClick={() => setMoreOpen(false)}
                    >
                      <SettingsIcon className="w-5 h-5" />
                      Settings
                    </Link>
                    {canAdminister ? (
                      <Link
                        role="menuitem"
                        to="/admin/settings"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px] font-bold"
                        onClick={() => setMoreOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    ) : null}
                    {/* The verification console is the admin page reached most
                        often, so it gets its own entry rather than sitting two
                        clicks deep under Settings. */}
                    {can(PERMISSIONS.VERIFICATION_GRANT) ? (
                      <Link
                        role="menuitem"
                        to="/admin/verification"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px] font-bold"
                        onClick={() => setMoreOpen(false)}
                      >
                        Verification
                      </Link>
                    ) : null}
                    <Link
                      role="menuitem"
                      to="/settings/appearance"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px]"
                      onClick={() => setMoreOpen(false)}
                    >
                      Appearance
                    </Link>
                    <Link
                      role="menuitem"
                      to="/settings/account"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px]"
                      onClick={() => setMoreOpen(false)}
                    >
                      Account / switch
                    </Link>

                    {accounts.length > 0 ? (
                      <>
                        <div
                          className="border-t px-4 py-2 text-[12px] font-bold uppercase tracking-wide"
                          style={{
                            borderColor: "var(--color-border)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Accounts
                        </div>
                        {accounts.map((a) => (
                          <Link
                            key={a.userId}
                            to={active?.id === a.userId ? `/${a.username}` : `/login?u=${encodeURIComponent(a.username)}`}
                            role="menuitem"
                            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[var(--color-bg-secondary)] text-left"
                            onClick={() => setMoreOpen(false)}
                          >
                            <img
                              src={a.avatarUrl || "/assets/default-avatar.svg"}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block font-bold text-[14px] truncate">
                                {a.displayName}
                              </span>
                              <span
                                className="block text-[12px] truncate"
                                style={{ color: "var(--color-text-secondary)" }}
                              >
                                @{a.username}
                                {active?.id === a.userId ? " · Active" : " · Sign in to switch"}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </>
                    ) : null}

                    <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      {isAuthenticated ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px]"
                          onClick={() => {
                            logout();
                            setMoreOpen(false);
                            navigate("/login");
                          }}
                        >
                          Log out
                          {active ? ` @${active.username}` : ""}
                        </button>
                      ) : (
                        <Link
                          role="menuitem"
                          to="/login"
                          className="block px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px] font-bold"
                          onClick={() => setMoreOpen(false)}
                        >
                          Sign in
                        </Link>
                      )}
                      <Link
                        role="menuitem"
                        to="/login"
                        className="block px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px]"
                        onClick={() => setMoreOpen(false)}
                      >
                        Add an existing account
                      </Link>
                    </div>
                  </div>
                ) : null}
              </li>
            </ul>

            <Link
              to="/home#composer"
              className="btn btn-primary mt-4 w-[50px] h-[50px] xl:w-full xl:min-h-[52px] p-0 xl:px-8 text-[17px] self-center xl:self-auto"
              aria-label="Post"
            >
              <span className="hidden xl:inline">Post</span>
              <ComposeIcon className="w-6 h-6 xl:hidden" />
            </Link>

            {/* Active account chip — opens account switcher dropdown on desktop */}
            <div className="mt-auto mb-3 flex xl:justify-start justify-center relative" ref={accountRef}>
              {active ? (
                <>
                  <button
                    type="button"
                    className="nav-item w-full max-w-full"
                    onClick={() => setAccountOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    title="Account menu"
                  >
                    <img
                      src={active.avatarUrl || "/assets/default-avatar.svg"}
                      alt=""
                      className="w-[26.25px] h-[26.25px] rounded-full object-cover shrink-0"
                    />
                    <span className="hidden xl:inline pr-4 text-[15px] truncate">
                      @{active.username}
                    </span>
                  </button>
                  {accountOpen ? (
                    <div
                      role="menu"
                      className="absolute left-0 bottom-full mb-2 w-[280px] rounded-2xl border shadow-xl z-50 overflow-hidden"
                      style={{
                        background: "var(--color-bg)",
                        borderColor: "var(--color-border)",
                        boxShadow: "0 0 15px rgba(0,0,0,0.2)",
                      }}
                    >
                      <div
                        className="px-4 py-2 text-[12px] font-bold uppercase tracking-wide"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Accounts
                      </div>
                      {accounts.map((a) => (
                        <Link
                          key={a.userId}
                          to={
                            active?.id === a.userId
                              ? `/${a.username}`
                              : `/login?u=${encodeURIComponent(a.username)}`
                          }
                          role="menuitem"
                          className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[var(--color-bg-secondary)] text-left"
                          onClick={() => setAccountOpen(false)}
                        >
                          <img
                            src={a.avatarUrl || "/assets/default-avatar.svg"}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold text-[14px] truncate">{a.displayName}</span>
                            <span
                              className="block text-[12px] truncate"
                              style={{ color: "var(--color-text-secondary)" }}
                            >
                              @{a.username}
                              {active?.id === a.userId ? " · Active" : ""}
                            </span>
                          </span>
                        </Link>
                      ))}
                      <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                        <Link
                          role="menuitem"
                          to="/login"
                          className="block px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px]"
                          onClick={() => setAccountOpen(false)}
                        >
                          Add an existing account
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-secondary)] text-[15px]"
                          onClick={() => {
                            logout();
                            setAccountOpen(false);
                            navigate("/login");
                          }}
                        >
                          Log out @{active.username}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <Link to="/login" className="nav-item">
                  <ProfileIcon className="w-[26.25px] h-[26.25px] shrink-0" />
                  <span className="hidden xl:inline pr-4 text-[15px]">Sign in</span>
                </Link>
              )}
            </div>
          </nav>
        </div>

        <main
          className="flex-1 min-w-0 w-full max-w-[600px] border-x md:!pb-0"
          style={{
            borderColor: "var(--color-border)",
            // Clear the fixed bottom bar plus the home-indicator area. The bar
            // is phone-only, so this is undone from md upward by md:!pb-0.
            paddingBottom: "calc(60px + env(safe-area-inset-bottom))",
          }}
        >
          <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} />
          <Outlet />
        </main>

        <aside className="hidden lg:block w-[350px] shrink-0 px-8 py-1 sticky top-0 h-screen overflow-y-auto">
          <div className="sticky top-0 py-2 z-10" style={{ background: "var(--color-bg)" }}>
            <form
              className="relative"
              onSubmit={(event) => {
                event.preventDefault();
                const q = search.trim();
                if (q) navigate(`/explore?q=${encodeURIComponent(q)}`);
              }}
            >
              <SearchIcon
                className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-text-secondary)" }}
              />
              <input
                type="search"
                placeholder="Search"
                className="x-search"
                aria-label="Search Horizon"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>
          </div>

          <section className="card mt-3 overflow-hidden" aria-labelledby="trends-heading">
            <h2 id="trends-heading" className="text-[20px] font-extrabold px-4 pt-3 pb-2">
              Trends
            </h2>
            <p className="px-4 pb-4 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
              Trends appear once the instance has activity. Ranking is statistical and configurable by
              administrators — never algorithmic profiling.
            </p>
          </section>

          <section className="card mt-4 overflow-hidden" aria-labelledby="follow-heading">
            <h2 id="follow-heading" className="text-[20px] font-extrabold px-4 pt-3 pb-2">
              Who to follow
            </h2>
            <p className="px-4 pb-4 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
              Suggestions from your own network appear here.
            </p>
          </section>

          <nav
            className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-4 text-[13px]"
            style={{ color: "var(--color-text-secondary)" }}
            aria-label="Footer"
          >
            <Link to="/about" className="hover:underline">
              About
            </Link>
            <Link to="/settings" className="hover:underline">
              Settings
            </Link>
            <a href="https://github.com/m4rcel-lol/horizon" className="hover:underline">
              Source
            </a>
            <span>AGPL-3.0</span>
          </nav>
        </aside>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <MobileBottomNav />
    </div>
  );
}
