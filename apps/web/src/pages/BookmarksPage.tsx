export function BookmarksPage() {
  return (
    <div>
      <header className="sticky top-0 z-10 backdrop-blur bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-xl font-bold">Bookmarks</h1>
      </header>
      <div className="p-8 text-center text-[var(--color-text-secondary)]">
        Saved posts appear here. Bookmarks are private by default.
      </div>
    </div>
  );
}
