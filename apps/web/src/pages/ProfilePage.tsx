import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "../icons";
import { api, ApiError } from "../api";
import { Avatar, NameWithBadges, VerifiedBadge } from "../components/Verification";
import { PostCard } from "../components/PostCard";
import { EditProfileModal } from "../components/EditProfileModal";
import { ComposerModal, type ComposerTarget } from "../components/ComposerModal";
import { FollowButton } from "../components/FollowButton";
import { MessageButton } from "../components/MessageButton";
import { FollowsYouChip } from "../components/FollowsYouChip";
import { ProfileMenu } from "../components/ProfileMenu";
import { ProfileCommunities } from "../components/CommunityCard";
import { PageLoader } from "../components/LoadingSpinner";
import { SeoHead } from "../components/SeoHead";
import { RichText } from "../components/RichText";
import { useSession } from "../hooks/useSession";

export function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { active } = useSession();
  const handle = username ?? active?.username ?? "";
  const [editOpen, setEditOpen] = useState(false);
  const [composing, setComposing] = useState<ComposerTarget>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
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

  const { data: postData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", handle],
    queryFn: () => api.listPosts(handle),
    enabled: Boolean(handle) && !notFound,
    retry: false,
  });
  const posts = postData?.posts ?? [];

  const { data: relationship } = useQuery({
    queryKey: ["relationship", handle],
    queryFn: () => api.relationship(handle!),
    enabled: Boolean(handle) && !notFound && !isOwnProfile,
    retry: false,
  });
  // A private account returns an empty timeline to anyone it has not approved.
  // Saying "no posts yet" there would be a lie about the account rather than a
  // statement about the reader, so the two cases are told apart here.
  const withheld = Boolean(relationship && !relationship.canViewPosts);
  // A block does not hide posts on this instance — it stops interaction — so
  // the banner explains the disabled buttons rather than an empty timeline.
  const blockedBy = Boolean(relationship?.blockedBy);
  const blocking = Boolean(relationship?.blocking);

  const bannerSrc = localBanner || user?.bannerUrl || null;
  const avatarSrc =
    localAvatar || user?.avatarUrl || active?.avatarUrl || "/assets/default-avatar.svg";

  const following = user?.followingCount ?? 0;
  const followers = user?.followersCount ?? 0;

  return (
    <div className="animate-fade-in">
      <SeoHead
        title={user ? `${user.displayName} (@${user.username})` : `@${handle}`}
        description={user?.bio || `@${handle} on Horizon`}
        url={`/${user?.username ?? handle}`}
        image={user?.avatarUrl || "/assets/default-avatar.svg"}
        type="profile"
      />
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

      <div className="relative h-[200px] z-0" style={{ background: "var(--color-bg-secondary)" }}>
        {bannerSrc ? (
          <img src={bannerSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
      </div>

      <div className="px-4 pb-3 relative z-[1]">
        <div className="flex justify-between items-start">
          <div className="profile-avatar-overlap -mt-[66px]">
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
              <Avatar shape={user?.avatarShape ?? "circle"} size={133} ring src={avatarSrc} />
            )}
          </div>
          <div className="flex items-center gap-2 pt-3">
            <ProfileMenu user={user} />
            {isOwnProfile ? (
              <button type="button" className="btn btn-outline" onClick={() => setEditOpen(true)}>
                Edit profile
              </button>
            ) : user ? (
              <>
                <MessageButton user={user} onMention={() => setComposing({ mode: "mention", user })} />
                <FollowButton username={user.username} />
              </>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <PageLoader label="Loading profile…" />
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
              <h2 className="text-[20px] font-extrabold leading-6 inline-flex items-center gap-1.5 flex-wrap">
                <NameWithBadges
                  displayName={user?.displayName ?? active?.displayName ?? `@${handle}`}
                  verification={user?.effectiveVerification ?? "NONE"}
                  affiliatedTo={user?.affiliatedTo}
                  badgeClassName="w-5 h-5"
                  badgeHref={user && user.affiliateCount > 0 ? `/${user.username}/affiliates` : undefined}
                  badgeTitle={user && user.affiliateCount > 0 ? "See affiliated accounts" : undefined}
                  isProtected={user?.isProtected}
                  isAutomated={Boolean(user?.automatedBy) && !user?.automatedPending}
                />
              </h2>
              <p
                className="text-[15px] flex items-center gap-2 flex-wrap"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span>@{user?.username ?? active?.username ?? handle}</span>
                {user ? <FollowsYouChip username={user.username} /> : null}
              </p>
            </div>

            {user?.bio ? (
              <p className="mt-3 text-[15px] whitespace-pre-wrap">
                <RichText text={user.bio} />
              </p>
            ) : null}

            <div
              className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[14px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {user?.pronouns ? <span>{user.pronouns}</span> : null}
              {user?.location ? <span>📍 {user.location}</span> : null}
              {user?.website ? (
                <a href={user.website.startsWith("http") ? user.website : `https://${user.website}`} className="link" target="_blank" rel="noopener noreferrer">
                  {user.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
              {user?.birthday ? <span>🎂 {user.birthday}</span> : null}
            </div>

            {user?.automatedBy ? (
              <p className="mt-2 text-[14px] flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <span aria-hidden="true">🤖</span>
                Automated by{" "}
                <a href={`/${user.automatedBy.username}`} className="link">
                  @{user.automatedBy.username}
                </a>
              </p>
            ) : null}

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

            {/* Counts link to the lists behind them, which is the only way to
                find out who those people actually are. */}
            <div className="flex gap-5 mt-3 text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
              <Link to={`/${user?.username ?? handle}/following`} className="hover:underline">
                <strong style={{ color: "var(--color-text)" }}>{following}</strong> Following
              </Link>
              <Link to={`/${user?.username ?? handle}/followers`} className="hover:underline">
                <strong style={{ color: "var(--color-text)" }}>{followers}</strong> Followers
              </Link>
            </div>

            {user ? <ProfileCommunities username={user.username} /> : null}

            {blockedBy || blocking ? (
              <p
                className="mt-3 rounded-2xl border p-3 text-[14px]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                {blockedBy
                  ? `@${user?.username ?? handle} has blocked you. You can still read their posts, but you cannot follow them or reply, like, repost or quote anything they post.`
                  : `You have blocked @${user?.username ?? handle}. They cannot follow you or interact with your posts. They can still read them.`}
              </p>
            ) : null}
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

      {postsLoading ? (
        <PageLoader label="Loading posts…" />
      ) : posts.length > 0 ? (
        <ul className="animate-fade-in">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                onReply={(p) => setComposing({ mode: "reply", post: p })}
                onQuote={(p) => setComposing({ mode: "quote", post: p })}
              />
            </li>
          ))}
        </ul>
      ) : withheld ? (
        <div className="empty-state">
          <h2>These posts are protected</h2>
          <p>
            Only people @{user?.username ?? handle} has approved can see their posts. Their replies
            stay visible to everyone.
          </p>
        </div>
      ) : (
        <div className="empty-state">
          <h2>No posts yet</h2>
          <p>When @{(user?.username ?? handle) || "you"} posts, it will show up here.</p>
        </div>
      )}

      <EditProfileModal
        open={editOpen}
        onClose={() => {
          if (!saving) setEditOpen(false);
        }}
        displayName={user?.displayName ?? active?.displayName ?? ""}
        bio={user?.bio ?? ""}
        website={user?.website ?? ""}
        location={user?.location ?? ""}
        pronouns={user?.pronouns ?? ""}
        birthday={user?.birthday ?? ""}
        avatarUrl={avatarSrc}
        bannerUrl={bannerSrc}
        onSave={async ({ displayName, bio, website, location, pronouns, birthday, avatarFile, bannerFile }) => {
          if (!active?.username) return;
          setSaveError(null);
          setSaving(true);
          try {
            // Upload first: if storing the file fails there is no point
            // writing a URL that would 404, and the old picture is still good.
            const [avatarUrl, bannerUrl] = await Promise.all([
              avatarFile ? api.uploadMedia(avatarFile, "avatar").then((r) => r.url) : undefined,
              bannerFile ? api.uploadMedia(bannerFile, "banner").then((r) => r.url) : undefined,
            ]);

            // Sent even when blank: an empty string is how you clear one of
            // these, so `|| undefined` would make them impossible to remove
            // once set.
            await api.updateUser(active.username, {
              displayName: displayName || undefined,
              bio: bio ?? "",
              website: website ?? "",
              location: location ?? "",
              pronouns: pronouns ?? "",
              birthday: birthday ?? "",
              ...(avatarUrl ? { avatarUrl } : {}),
              ...(bannerUrl ? { bannerUrl } : {}),
            });

            // The stored URL is the truth now; drop the local preview so the
            // page stops showing a blob that dies with the tab.
            if (avatarUrl && localAvatar) {
              URL.revokeObjectURL(localAvatar);
              setLocalAvatar(null);
            }
            if (bannerUrl && localBanner) {
              URL.revokeObjectURL(localBanner);
              setLocalBanner(null);
            }
            await queryClient.invalidateQueries({ queryKey: ["user", handle] });
            await queryClient.invalidateQueries({ queryKey: ["session"] });
            await refetch();
            setEditOpen(false);
          } catch (err) {
            const message =
              err instanceof ApiError ? err.message : "Could not save profile. Try again.";
            setSaveError(message);
          } finally {
            setSaving(false);
          }
        }}
      />
      {saveError ? (
        <p className="px-4 py-2 text-[14px] text-red-500" role="alert">
          {saveError}
        </p>
      ) : null}

      <ComposerModal target={composing} onClose={() => setComposing(null)} />
    </div>
  );
}
