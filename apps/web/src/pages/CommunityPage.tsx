import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api } from "../api";
import { PostCard } from "../components/PostCard";
import { PageLoader } from "../components/LoadingSpinner";
import { useSession } from "../hooks/useSession";
import { useState } from "react";

export function CommunityPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { active } = useSession();
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => api.getCommunity(slug!),
    enabled: Boolean(slug),
  });

  const community = data?.community;

  const { data: postData, isLoading: postsLoading } = useQuery({
    queryKey: ["community-posts", slug],
    queryFn: () => api.listCommunityPosts(slug!),
    enabled: Boolean(slug),
  });
  const posts = postData?.posts ?? [];

  const join = useMutation({
    mutationFn: () => api.joinCommunity(slug!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", slug] }),
  });
  const leave = useMutation({
    mutationFn: () => api.leaveCommunity(slug!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", slug] }),
  });

  const isOwner = active && community && active.username === community.owner.username;

  return (
    <div className="animate-fade-in">
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title truncate">{community?.name ?? "Community"}</h1>
      </header>

      {isLoading ? (
        <PageLoader />
      ) : !community ? (
        <div className="empty-state">
          <h2>Community not found</h2>
        </div>
      ) : (
        <>
          <div className="relative h-[160px] z-0" style={{ background: "var(--color-bg-secondary)" }}>
            {community.bannerUrl ? (
              <img src={community.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="px-4 pb-3 relative z-[1]">
            <div className="flex justify-between items-start">
              <div className="profile-avatar-overlap -mt-[40px]">
                <img
                  src={community.avatarUrl || "/assets/default-avatar.svg"}
                  alt=""
                  className="w-[80px] h-[80px] rounded-2xl object-cover border-4"
                  style={{ borderColor: "var(--color-bg)", background: "var(--color-bg-secondary)" }}
                />
              </div>
              <div className="flex gap-2 pt-3">
                {isOwner ? (
                  <button type="button" className="btn btn-outline" onClick={() => setSettingsOpen(true)}>
                    Settings
                  </button>
                ) : null}
                {active ? (
                  community.joinedByViewer ? (
                    <button type="button" className="btn btn-outline" onClick={() => leave.mutate()}>
                      Leave
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => join.mutate()}>
                      Join
                    </button>
                  )
                ) : null}
              </div>
            </div>
            <h2 className="mt-3 text-[20px] font-extrabold">{community.name}</h2>
            <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
              c/{community.slug} · {community.memberCount} members
            </p>
            {community.description ? <p className="mt-2 text-[15px]">{community.description}</p> : null}
            <p className="mt-1 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
              Owned by{" "}
              <Link to={`/${community.owner.username}`} className="link">
                @{community.owner.username}
              </Link>
            </p>
          </div>

          <div className="x-tabs" role="tablist">
            <button type="button" role="tab" aria-selected className="x-tab">
              Posts
            </button>
          </div>

          {postsLoading ? (
            <PageLoader label="Loading posts…" />
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <h2>No posts yet</h2>
              <p>Posts shared in this community will appear here.</p>
            </div>
          ) : (
            <ul>
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          )}

          {settingsOpen && isOwner ? (
            <CommunitySettingsModal
              slug={community.slug}
              avatarUrl={community.avatarUrl}
              bannerUrl={community.bannerUrl}
              onClose={() => setSettingsOpen(false)}
              onSaved={() => {
                setSettingsOpen(false);
                qc.invalidateQueries({ queryKey: ["community", slug] });
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function CommunitySettingsModal({
  slug,
  avatarUrl,
  bannerUrl,
  onClose,
  onSaved,
}: {
  slug: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [banner, setBanner] = useState(bannerUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] px-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <form
        className="relative w-full max-w-[480px] rounded-2xl border p-4 shadow-xl"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);
          try {
            await api.updateCommunity(slug, {
              avatarUrl: avatar || null,
              bannerUrl: banner || null,
            });
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
          } finally {
            setSaving(false);
          }
        }}
      >
        <h2 className="text-[20px] font-extrabold mb-4">Community settings</h2>
        <label className="x-label">Avatar URL</label>
        <input className="x-field mb-3" value={avatar} onChange={(e) => setAvatar(e.target.value)} />
        <label className="x-label">Banner URL</label>
        <input className="x-field mb-3" value={banner} onChange={(e) => setBanner(e.target.value)} />
        {error ? <p className="text-red-500 text-[14px] mb-2">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
