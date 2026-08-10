import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ReplyIcon, RepostIcon, LikeIcon, ShareIcon } from "../icons";

export function PostPage() {
  const { username, postId } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">Post</h1>
      </header>

      <article className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex gap-3">
          <img src="/assets/default-avatar.svg" alt="" className="avatar w-10 h-10" />
          <div className="min-w-0">
            <p className="font-bold leading-5">@{username}</p>
            <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
              @{username}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[17px] leading-6" style={{ color: "var(--color-text-secondary)" }}>
          Post <span className="font-mono">{postId}</span> loads from the API once posts exist on this instance.
        </p>

        <div
          className="flex justify-between max-w-[425px] mt-3 pt-2 border-t"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          {[ReplyIcon, RepostIcon, LikeIcon, ShareIcon].map((Icon, i) => (
            <span key={i} className="icon-btn">
              <Icon className="w-[18px] h-[18px]" />
            </span>
          ))}
        </div>
      </article>

      <div className="empty-state">
        <h2>No replies yet</h2>
        <p>Replies to this post will appear here in the order they were sent.</p>
      </div>
    </div>
  );
}
