export function CommunitiesPage() {
  return (
    <div>
      <header className="x-header">
        <h1 className="x-title">Communities</h1>
      </header>

      <div className="empty-state">
        <h2>Find your people</h2>
        <p className="mb-6">
          Communities are moderated spaces built around a shared interest, with their own rules and membership.
        </p>
        <button type="button" className="btn btn-primary btn-lg">
          Browse communities
        </button>
      </div>
    </div>
  );
}
