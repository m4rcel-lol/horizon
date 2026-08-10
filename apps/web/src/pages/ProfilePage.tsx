import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, MoreIcon } from "../icons";

export function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const handle = username ?? "profile";

  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="x-title truncate">@{handle}</h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            Profile
          </p>
        </div>
      </header>

      {/* Banner */}
      <div className="h-[200px]" style={{ background: "var(--color-bg-secondary)" }} />

      <div className="px-4 pb-3">
        <div className="flex justify-between items-start">
          <img
            src="/assets/default-avatar.svg"
            alt=""
            className="avatar w-[133px] h-[133px] -mt-[66px] border-4"
            style={{ borderColor: "var(--color-bg)" }}
          />
          <div className="flex items-center gap-2 pt-3">
            <button type="button" className="icon-btn border" style={{ borderColor: "var(--color-border-strong)" }} aria-label="More">
              <MoreIcon className="w-4 h-4" />
            </button>
            <button type="button" className="btn btn-outline">
              Follow
            </button>
          </div>
        </div>

        <div className="mt-3">
          <h2 className="text-[20px] font-extrabold leading-6">@{handle}</h2>
          <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
            @{handle}
          </p>
        </div>

        <p className="mt-3 text-[15px]">
          This profile is rendered from the API once accounts exist on the instance.
        </p>

        <div className="flex gap-5 mt-3 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
          <span>
            <strong style={{ color: "var(--color-text)" }}>—</strong> Following
          </span>
          <span>
            <strong style={{ color: "var(--color-text)" }}>—</strong> Followers
          </span>
        </div>
      </div>

      <div className="x-tabs" role="tablist" aria-label="Profile sections">
        {["Posts", "Replies", "Media", "Likes"].map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={i === 0} className="x-tab">
            {label}
          </button>
        ))}
      </div>

      <div className="empty-state">
        <h2>No posts yet</h2>
        <p>When @{handle} posts, it will show up here.</p>
      </div>
    </div>
  );
}
