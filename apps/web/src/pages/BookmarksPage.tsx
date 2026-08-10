import { MoreIcon } from "../icons";

export function BookmarksPage() {
  return (
    <div>
      <header className="x-header justify-between">
        <h1 className="x-title">Bookmarks</h1>
        <button type="button" className="icon-btn" aria-label="Bookmark options">
          <MoreIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="empty-state">
        <h2>Save posts for later</h2>
        <p>Bookmark posts to find them again. Bookmarks are private, and folders let you keep them organised.</p>
      </div>
    </div>
  );
}
