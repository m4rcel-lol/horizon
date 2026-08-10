export function HomePage() {
  return (
    <div>
      <header className="sticky top-0 z-10 backdrop-blur bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-xl font-bold">Home</h1>
      </header>
      <div className="p-8 text-center text-[var(--color-text-secondary)]">
        <p className="mb-2">Your timeline will appear here once you follow people and posts are created.</p>
        <p className="text-sm">Following feed is chronological. For You uses deterministic, non-AI ranking signals.</p>
      </div>
    </div>
  );
}
