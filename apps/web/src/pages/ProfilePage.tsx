import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, MoreIcon } from "../icons";
import { api, ApiError } from "../api";
import { Avatar, NameWithBadges, VerifiedBadge } from "../components/Verification";
import { PostCard } from "../components/PostCard";
import { EditProfileModal } from "../components/EditProfileModal";
import { useSession } from "../hooks/useSession";

export function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { active } = useSession();
  const handle = username ?? active?.username ?? "";
  const [editOpen, setEditOpen] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["user", handle],
    queryFn: () => api.getUser(handle),
    retry: false,
    enabled: Boolean(handle),
  });

  const user = data?.user;
  const notFound = error instanceof ApiError && error.status === 404;
  const isOwnProfile =
    Boolean(active) &&
    (username === undefined ||
      username === "profile" ||
      (user && active?.username === user.username) ||
      active?.username === handle);

  const { data: postData } = useQuery({
    queryKey: ["posts", handle],
    queryFn: () => api.listPosts(handle),
    enabled: Boolean(handle) && !notFound,
    retry: false,
  });
  const posts = postData?.posts ?? [];

  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="x-title truncate">{user ? user.displayName : `@${handle}`}</h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {user ? `@${user.username}` : "Profile"}
          </p>
        </div>
      </header>

      <div className="relative h-[200px]" style={{ background: "var(--color-bg-secondary)" }}>
        {localBanner ? (
          <img src={localBanner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
      </div>

      <div className="px-4 pb-3">
        <div className="flex justify-between items-start">
          <div className="-mt-[66px]">
            {localAvatar ? (
              <img
                src={localAvatar}
                alt=""
                className="rounded-full object-cover border-4"
                style={{
                  width: 133,
                  height: 133,
                  borderColor: "var(--color-bg)",
                  background: "var(--color-bg-secondary)",
                }}
              />
            ) : (
              <Avatar shape={user?.avatarShape ?? "circle"} size={133} ring />
            )}
          </div>
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              className="icon-btn border"
              style={{ borderColor: "var(--color-border-strong)" }}
              aria-label="More"
            >
              <MoreIcon className="w-4 h-4" />
            </button>
            {isOwnProfile ? (
              <button type="button" className="btn btn-outline" onClick={() => setEditOpen(true)}>
                Edit profile
              </button>
            ) : (
              <button type="button" className="btn btn-outline">
                Follow
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
            Loading profile…
          </p>
        ) : notFound && !isOwnProfile ? (
          <div className="mt-4">
            <h2 className="text-[20px] font-extrabold">This account doesn&apos;t exist</h2>
            <p className="text-[15px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Try searching for another.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-3">
              <h2 className="text-[20px] font-extrabold leading-6">
                <NameWithBadges
                  displayName={user?.displayName ?? active?.displayName ?? `@${handle}`}
                  verification={user?.effectiveVerification ?? "NONE"}
                  affiliatedTo={user?.affiliatedTo}
                  badgeClassName="w-5 h-5"
                  badgeHref={user && user.affiliateCount > 0 ? `/${user.username}/affiliates` : undefined}
                  badgeTitle={user && user.affiliateCount > 0 ? "See affiliated accounts" : undefined}
                />
              </h2>
              <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
                @{user?.username ?? active?.username ?? handle}
              </p>
            </div>

            {user?.bio ? <p className="mt-3 text-[15px]">{user.bio}</p> : null}

            {user && user.effectiveVerification !== "NONE" ? (
              <p
                className="mt-3 text-[14px] flex items-center gap-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <VerifiedBadge type={user.effectiveVerification} className="w-4 h-4" />
                {user.verificationLabel}
                {user.verification === "NONE" && user.affiliatedTo ? " through affiliation" : null}
              </p>
            ) : null}

            {user?.isSystem ? (
              <p className="mt-1 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                Automated account run by this instance. It cannot be signed into, edited or suspended.
                {user.username === "CommunityNotes" ? (
                  <>
                    {" "}
                    <Link to="/notes" className="link">
                      See the notes it publishes
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}

            {user?.affiliatedTo ? (
              <p className="mt-1 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                Affiliated with{" "}
                <Link to={`/${user.affiliatedTo.username}`} className="link">
                  {user.affiliatedTo.displayName}
                </Link>
              </p>
            ) : null}

            {user && user.affiliateCount > 0 ? (
              <p className="mt-1 text-[14px]">
                <Link
                  to={`/${user.username}/affiliates`}
                  className="hover:underline"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <strong style={{ color: "var(--color-text)" }}>{user.affiliateCount}</strong> affiliated{" "}
                  {user.affiliateCount === 1 ? "account" : "accounts"}
                </Link>
              </p>
            ) : null}

            <div className="flex gap-5 mt-3 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
              <span>
                <strong style={{ color: "var(--color-text)" }}>—</strong> Following
              </span>
              <span>
                <strong style={{ color: "var(--color-text)" }}>—</strong> Followers
              </span>
            </div>
          </>
        )}
      </div>

      <div className="x-tabs" role="tablist" aria-label="Profile sections">
        {["Posts", "Replies", "Media", "Likes"].map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={i === 0} className="x-tab">
            {label}
          </button>
        ))}
      </div>

      {posts.length > 0 ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>No posts yet</h2>
          <p>When @{user?.username ?? handle || "you"} posts, it will show up here.</p>
        </div>
      )}

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        displayName={user?.displayName ?? active?.displayName ?? ""}
        bio={user?.bio}
        avatarUrl={localAvatar || active?.avatarUrl}
        bannerUrl={localBanner}
        onSave={({ avatarFile, bannerFile }) => {
          // Preview locally until media upload API is connected.
          if (avatarFile) {
            if (localAvatar) URL.revokeObjectURL(localAvatar);
            setLocalAvatar(URL.createObjectURL(avatarFile));
          }
          if (bannerFile) {
            if (localBanner) URL.revokeObjectURL(localBanner);
            setLocalBanner(URL.createObjectURL(bannerFile));
          }
        }}
      />
    </div>
  );
}
