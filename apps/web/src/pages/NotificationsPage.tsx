import { SettingsIcon } from "../icons";

export function NotificationsPage() {
  return (
    <div>
      <header className="x-header justify-between">
        <h1 className="x-title">Notifications</h1>
        <button type="button" className="icon-btn" aria-label="Notification settings">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="x-tabs sticky top-[53px] z-10" role="tablist" aria-label="Notification filters">
        {["All", "Verified", "Mentions"].map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={i === 0} className="x-tab">
            {label}
          </button>
        ))}
      </div>

      <div className="empty-state">
        <h2>Nothing to see here — yet</h2>
        <p>Likes, reposts, replies and mentions land here. Notification types are configurable in your settings.</p>
      </div>
    </div>
  );
}
