import { Outlet, NavLink } from "react-router-dom";
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
} from "../icons";

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
  return (
    <div className="min-h-screen flex justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-[1280px] flex">
        {/* Left navigation - desktop */}
        <nav
          className="hidden md:flex flex-col w-[275px] shrink-0 px-3 py-2 sticky top-0 h-screen border-r border-[var(--color-border)]"
          aria-label="Main"
        >
          <div className="mb-4 px-3">
            <NavLink to="/" className="inline-flex p-2 rounded-full hover:bg-[var(--color-bg-secondary)]">
              <img src="/assets/logo.svg" alt="Horizon" className="w-8 h-8" />
            </NavLink>
          </div>

          <ul className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-5 px-3 py-3 rounded-full text-xl transition-colors hover:bg-[var(--color-bg-secondary)] ${
                      isActive ? "font-bold" : "font-normal"
                    }`
                  }
                >
                  <Icon className="w-7 h-7" />
                  <span className="hidden xl:inline">{label}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex items-center gap-5 px-3 py-3 rounded-full text-xl w-full hover:bg-[var(--color-bg-secondary)]"
              >
                <MoreIcon className="w-7 h-7" />
                <span className="hidden xl:inline">More</span>
              </button>
            </li>
          </ul>

          <button
            type="button"
            className="mt-4 mx-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold py-3 px-6 rounded-full transition-colors"
          >
            Post
          </button>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 border-x border-[var(--color-border)] max-w-[600px]">
          <Outlet />
        </main>

        {/* Right sidebar - desktop */}
        <aside className="hidden lg:block w-[350px] shrink-0 px-6 py-2 sticky top-0 h-screen overflow-y-auto">
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-4 mb-4">
            <h2 className="font-bold text-xl mb-3">Trends</h2>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Trends will appear here once the instance has activity.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-4">
            <h2 className="font-bold text-xl mb-3">Who to follow</h2>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Suggestions based on your network will appear here.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 border-t border-[var(--color-border)] bg-[var(--color-bg)] z-50"
        aria-label="Mobile"
      >
        {navItems.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `p-3 ${isActive ? "text-[var(--color-primary)]" : ""}`
            }
            aria-label={label}
          >
            <Icon className="w-6 h-6" />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
