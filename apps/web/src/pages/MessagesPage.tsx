import { SettingsIcon, ComposeIcon } from "../icons";

export function MessagesPage() {
  return (
    <div>
      <header className="x-header justify-between">
        <h1 className="x-title">Messages</h1>
        <div className="flex gap-1">
          <button type="button" className="icon-btn" aria-label="Message settings">
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button type="button" className="icon-btn" aria-label="New message">
            <ComposeIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="empty-state">
        <h2>Welcome to your inbox</h2>
        <p className="mb-6">
          Direct messages are private conversations between you and other people. Start one from any profile.
        </p>
        <button type="button" className="btn btn-primary btn-lg">
          Write a message
        </button>
      </div>
    </div>
  );
}
