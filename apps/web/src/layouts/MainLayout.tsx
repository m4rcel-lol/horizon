import { Outlet, NavLink, Link } from "react-router-dom";
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
  SunIcon,
  MoonIcon,
} from "../icons";
import { useTheme } from "../theme";

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

export function MainLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[1290px] flex">
        {/* Left rail — icons only from md, icons + labels from xl */}
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
                    <Icon className="w-[26.25px] h-[26.25px] shrink-0" />
                    <span className="hidden xl:inline pr-4">{label}</span>
                  </NavLink>
                </li>
              ))}
              <li>
                <button type="button" className="nav-item w-full">
                  <MoreIcon className="w-[26.25px] h-[26.25px] shrink-0" />
                  <span className="hidden xl:inline pr-4">More</span>
                </button>
              </li>
            </ul>

            <button
              type="button"
              className="btn btn-primary mt-4 w-[50px] h-[50px] xl:w-full xl:min-h-[52px] p-0 xl:px-8 text-[17px] self-center xl:self-auto"
              aria-label="Post"
            >
              <span className="hidden xl:inline">Post</span>
              <ComposeIcon className="w-6 h-6 xl:hidden" />
            </button>

            <div className="mt-auto mb-3 flex xl:justify-start justify-center">
              <button
                type="button"
                onClick={toggle}
                className="nav-item"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <SunIcon className="w-[26.25px] h-[26.25px] shrink-0" />
                ) : (
                  <MoonIcon className="w-[26.25px] h-[26.25px] shrink-0" />
                )}
                <span className="hidden xl:inline pr-4 text-[15px]">
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* Timeline column */}
        <main
          className="flex-1 min-w-0 w-full max-w-[600px] border-x pb-16 md:pb-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Outlet />
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:block w-[350px] shrink-0 px-8 py-1 sticky top-0 h-screen overflow-y-auto">
          <div className="sticky top-0 py-2 z-10" style={{ background: "var(--color-bg)" }}>
            <div className="relative">
              <SearchIcon
                className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-text-secondary)" }}
              />
              <input type="search" placeholder="Search" className="x-search" aria-label="Search Horizon" />
            </div>
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
            <a href="https://github.com/m4rcel-lol/horizon" className="hover:underline">
              Source
            </a>
            <span>AGPL-3.0</span>
          </nav>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 flex justify-around items-center h-[53px] border-t z-50"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
        aria-label="Primary"
      >
        {navItems.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `p-3 ${isActive ? "" : "opacity-60"}`}
            aria-label={label}
          >
            <Icon className="w-[26px] h-[26px]" />
          </NavLink>
        ))}
      </nav>

      {/* Mobile compose button */}
      <button
        type="button"
        className="md:hidden fixed right-4 bottom-[69px] w-14 h-14 rounded-full btn btn-primary shadow-lg z-50"
        aria-label="Post"
      >
        <ComposeIcon className="w-6 h-6" />
      </button>
    </div>
  );
}
