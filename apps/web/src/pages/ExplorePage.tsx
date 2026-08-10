import { SearchIcon, SettingsIcon } from "../icons";

export function ExplorePage() {
  return (
    <div>
      <header className="x-header gap-3">
        <div className="relative flex-1">
          <SearchIcon
            className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-secondary)" }}
          />
          <input type="search" placeholder="Search Horizon" className="x-search" aria-label="Search Horizon" />
        </div>
        <button type="button" className="icon-btn shrink-0" aria-label="Explore settings">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="x-tabs sticky top-[53px] z-10" role="tablist" aria-label="Explore">
        {["For you", "Trending", "News", "Sports"].map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={i === 0} className="x-tab">
            {label}
          </button>
        ))}
      </div>

      <div className="empty-state">
        <h2>Nothing trending yet</h2>
        <p>
          Trends are computed from activity on this instance using statistical signals only. They appear here once
          people start posting.
        </p>
      </div>
    </div>
  );
}
