import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaIcon, PollIcon, EmojiIcon, ScheduleIcon } from "../icons";
import { api } from "../api";
import { PostCard } from "../components/PostCard";

const tabs = [
  { id: "for-you", label: "For you" },
  { id: "following", label: "Following" },
] as const;

export function HomePage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("for-you");
  const { data, isLoading } = useQuery({ queryKey: ["posts"], queryFn: () => api.listPosts() });
  const posts = data?.posts ?? [];

  return (
    <div>
      <header className="x-header">
        <h1 className="x-title">Home</h1>
      </header>

      <div className="x-tabs sticky top-[53px] z-10" role="tablist" aria-label="Timeline">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="x-tab"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="flex gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <img src="/assets/default-avatar.svg" alt="" className="avatar w-10 h-10" />
        <div className="flex-1 min-w-0">
          <textarea
            rows={2}
            placeholder="What's happening?"
            aria-label="Post text"
            className="w-full bg-transparent text-[20px] outline-none resize-none placeholder:text-[var(--color-text-secondary)] py-2"
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1" style={{ color: "var(--color-primary)" }}>
              {[MediaIcon, PollIcon, EmojiIcon, ScheduleIcon].map((Icon, i) => (
                <span key={i} className="icon-btn">
                  <Icon className="w-5 h-5" />
                </span>
              ))}
            </div>
            <button type="button" className="btn btn-primary px-4" disabled>
              Post
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="px-4 py-6 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Loading timeline…
        </p>
      ) : tab === "for-you" && posts.length > 0 ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>{tab === "for-you" ? "Nothing here yet" : "Your following feed is empty"}</h2>
          <p>
            {tab === "for-you"
              ? "Posts from across the instance appear here. Ranking is deterministic and non-AI — administrators control the signals."
              : "Following is chronological. Follow people and their posts show up here, newest first."}
          </p>
        </div>
      )}
    </div>
  );
}
