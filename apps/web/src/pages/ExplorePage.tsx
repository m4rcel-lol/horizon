export function ExplorePage() {
  return (
    <div>
      <header className="sticky top-0 z-10 backdrop-blur bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-xl font-bold">Explore</h1>
      </header>
      <div className="p-4">
        <input
          type="search"
          placeholder="Search Horizon"
          className="w-full rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          aria-label="Search"
        />
        <div className="mt-6 text-[var(--color-text-secondary)] text-sm">
          Trends and popular posts will appear as the instance gains activity. Ranking is statistical and configurable by administrators.
        </div>
      </div>
    </div>
  );
}
