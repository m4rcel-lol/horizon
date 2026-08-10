import { SettingsIcon } from "../icons";

export function ListsPage() {
  return (
    <div>
      <header className="x-header justify-between">
        <h1 className="x-title">Lists</h1>
        <button type="button" className="icon-btn" aria-label="List settings">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="empty-state">
        <h2>Curate your own timelines</h2>
        <p className="mb-6">
          Lists gather posts from a chosen set of accounts into a single chronological feed. They can be public or
          private.
        </p>
        <button type="button" className="btn btn-primary btn-lg">
          Create a list
        </button>
      </div>
    </div>
  );
}
