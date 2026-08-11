import type {
  CommunityNoteClassification,
  CommunityNoteStatus,
  VerificationType,
} from "@horizon/shared";

export interface AffiliationSummary {
  id: string;
  username: string;
  displayName: string;
  verification: VerificationType;
  avatarShape: "circle" | "square";
  badge: string | null;
  /** The organisation's own picture, shown as the affiliate mark. */
  avatarUrl: string | null;
}

export interface ApiNote {
  id: string;
  postId: string;
  author: string | null;
  classification: CommunityNoteClassification;
  classificationLabel: string;
  body: string;
  sourceUrl: string | null;
  status: CommunityNoteStatus;
  statusLabel: string;
  visibleOnPost: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  totalRatings: number;
  ratingsNeeded: number;
  publishedBy: string;
  createdAt: string;
  /** How the caller rated it, so their own vote shows as chosen. */
  viewerRating: boolean | null;
}

export interface ApiPost {
  id: string;
  authorUsername: string;
  content: string;
  createdAt: string;
  /** Resolved at read time, so badges and avatar shape travel with the post. */
  author: ApiUser | null;
  /**
   * Notes on the post. Timelines carry only the ones readers accepted; the
   * post's own page also carries those still gathering ratings.
   */
  notes: ApiNote[];
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  /** The caller's own state, so the buttons render filled or not. */
  likedByViewer: boolean;
  repostedByViewer: boolean;
  /** The post this one quotes, embedded one level deep. */
  quoteOf: ApiPost | null;
  replyTo: { id: string; authorUsername: string } | null;
  bookmarkedByViewer: boolean;
  /** Whether the caller may delete it, so the menu only offers what will work. */
  deletableByViewer: boolean;
  media: ApiMedia[];
  poll: ApiPoll | null;
  /** Set when the row is on a profile because that account reposted it. */
  repostedBy: { username: string; displayName: string } | null;
  /** The community it was posted into, shown as "from <community>" beneath it. */
  community: { slug: string; name: string; avatarUrl: string | null } | null;
}

export interface ApiCommunity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  memberCount: number;
  joinMode?: "OPEN" | "REQUEST";
  verification?: "NONE" | "STANDARD";
  owner: { username: string; displayName: string };
  joinedByViewer: boolean;
  pendingRequestByViewer?: boolean;
}

export interface ApiCommunityJoinRequest {
  id: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  community: { slug: string; name: string };
}

export interface DailyPoint {
  date: string;
  posts: number;
}

export interface InstanceStats {
  accounts: { total: number; active: number; suspended: number; verified: number; system: number };
  posts: { total: number; original: number; replies: number; quotes: number; deleted: number };
  engagement: { likes: number; reposts: number; bookmarks: number; follows: number };
  notes: { total: number; helpful: number; notHelpful: number; pending: number };
  communities: { total: number; members: number };
  recent: { accounts: number; posts: number };
  daily: DailyPoint[];
}

export interface UserStats {
  username: string;
  posts: { total: number; original: number; replies: number; quotes: number };
  received: { likes: number; reposts: number; replies: number };
  given: { likes: number; reposts: number };
  audience: { followers: number; following: number };
  joinedAt: string;
  daily: DailyPoint[];
}

export interface ApiMedia {
  id: string;
  url: string;
  mimeType: string;
  type: "IMAGE" | "GIF";
  altText: string | null;
}

export interface ApiPoll {
  id: string;
  expiresAt: string;
  closed: boolean;
  totalVotes: number;
  votedOptionId: string | null;
  options: { id: string; text: string; voteCount: number; share: number }[];
}

export interface ScheduledPost {
  id: string;
  content: string;
  scheduledFor: string;
  status: string;
}

export interface ApiNotification {
  id: string;
  type: "LIKE" | "REPLY" | "REPOST" | "QUOTE" | "MENTION" | "FOLLOW" | "COMMUNITY";
  actor: ApiUser | null;
  postId: string | null;
  communityId?: string | null;
  href?: string | null;
  excerpt: string | null;
  read: boolean;
  createdAt: string;
}

export interface Relationship {
  following: boolean;
  followsYou: boolean;
  isSelf: boolean;
}

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  /** Public avatar URL; falls back to default when null. */
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  location?: string | null;
  pronouns?: string | null;
  birthday?: string | null;
  /** Tier granted directly, before affiliation is taken into account. */
  verification: VerificationType;
  /** Badge actually displayed. */
  effectiveVerification: VerificationType;
  badge: string | null;
  avatarShape: "circle" | "square";
  verificationLabel: string;
  canAffiliate: boolean;
  affiliatedTo: AffiliationSummary | null;
  affiliatedAt: string | null;
  affiliateCount: number;
  status: "ACTIVE" | "SUSPENDED";
  isSystem: boolean;
  loginDisabled: boolean;
  isAdmin?: boolean;
  /** Private account — follows require approval. */
  isProtected?: boolean;
  followingCount?: number;
  followersCount?: number;
  automatedBy?: { username: string; displayName: string } | null;
  automatedPending?: boolean;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new ApiError(
      data?.error?.code ?? "REQUEST_FAILED",
      data?.error?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  return data as T;
}

export const api = {
  // Auth
  me: () => request<{ user: ApiUser | null; permissions: string[] }>("/auth/me"),
  login: (identifier: string, password: string, remember = true) =>
    request<{ user: ApiUser; sessionToken?: string; expiresAt?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password, remember }),
    }),
  register: (input: { username: string; email: string; password: string; displayName?: string }) =>
    request<{ user: ApiUser; sessionToken?: string; expiresAt?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  switchAccount: (sessionToken: string) =>
    request<{ user: ApiUser }>("/auth/switch", {
      method: "POST",
      body: JSON.stringify({ sessionToken }),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  sessions: () =>
    request<{ current: string; sessions: { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastUsedAt: string }[] }>(
      "/auth/sessions",
    ),
  revokeOtherSessions: () => request<{ revoked: number }>("/auth/sessions/revoke-others", { method: "POST" }),

  listUsers: () => request<{ users: ApiUser[] }>("/users"),
  getUser: (username: string) => request<{ user: ApiUser }>(`/users/${encodeURIComponent(username)}`),
  createUser: (body: { username: string; displayName: string; bio?: string; verification?: VerificationType }) =>
    request<{ user: ApiUser }>("/users", { method: "POST", body: JSON.stringify(body) }),
  requestAutomation: (managerUsername: string) =>
    request<{ user: ApiUser }>("/users/automation/request", {
      method: "POST",
      body: JSON.stringify({ managerUsername }),
    }),
  resolveAutomation: (username: string, approve: boolean) =>
    request<{ user: ApiUser }>(`/users/${encodeURIComponent(username)}/automation`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    }),
  updateUser: (
    username: string,
    body: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string | null;
      bannerUrl?: string | null;
      website?: string | null;
      location?: string | null;
      pronouns?: string | null;
      birthday?: string | null;
      isProtected?: boolean;
    },
  ) =>
    request<{ user: ApiUser }>(`/users/${encodeURIComponent(username)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  setVerification: (username: string, type: VerificationType, reason?: string) =>
    request<{ user: ApiUser; releasedAffiliates: number }>(
      `/users/${encodeURIComponent(username)}/verification`,
      { method: "PATCH", body: JSON.stringify({ type, reason }) },
    ),
  affiliates: (username: string) =>
    request<{ affiliates: ApiUser[] }>(`/users/${encodeURIComponent(username)}/affiliates`),
  affiliate: (organisation: string, username: string) =>
    request<{ user: ApiUser; organisation: ApiUser }>(
      `/users/${encodeURIComponent(organisation)}/affiliates`,
      { method: "POST", body: JSON.stringify({ username }) },
    ),
  // Follows
  setFollow: (username: string, on: boolean) =>
    request<{ user: ApiUser; following: boolean }>(
      `/users/${encodeURIComponent(username)}/follow`,
      { method: "PUT", body: JSON.stringify({ on }) },
    ),
  relationship: (username: string) =>
    request<Relationship>(`/users/${encodeURIComponent(username)}/relationship`),
  followers: (username: string) =>
    request<{ users: ApiUser[] }>(`/users/${encodeURIComponent(username)}/followers`),
  followingList: (username: string) =>
    request<{ users: ApiUser[] }>(`/users/${encodeURIComponent(username)}/following`),

  // Notifications
  notifications: (filter?: "mentions") =>
    request<{ notifications: ApiNotification[] }>(
      `/notifications${filter ? `?filter=${filter}` : ""}`,
    ),
  unreadNotifications: () => request<{ count: number }>("/notifications/unread-count"),
  markNotificationsRead: () => request<{ read: number }>("/notifications/read", { method: "POST" }),

  // Bookmarks
  bookmarks: () => request<{ posts: ApiPost[] }>("/bookmarks"),
  setBookmark: (postId: string, on: boolean) =>
    request<{ bookmarked: boolean }>(`/bookmarks/${encodeURIComponent(postId)}`, {
      method: "PUT",
      body: JSON.stringify({ on }),
    }),

  // Communities
  communities: () => request<{ communities: ApiCommunity[] }>("/communities"),
  communitiesFor: (username: string) =>
    request<{ communities: ApiCommunity[] }>(`/communities?user=${encodeURIComponent(username)}`),
  community: (slug: string) =>
    request<{ community: ApiCommunity }>(`/communities/${encodeURIComponent(slug)}`),
  getCommunity: (slug: string) =>
    request<{ community: ApiCommunity }>(`/communities/${encodeURIComponent(slug)}`),
  createCommunity: (body: { name: string; description?: string; avatarUrl?: string }) =>
    request<{ community: ApiCommunity }>("/communities", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCommunity: (
    slug: string,
    body: {
      avatarUrl?: string | null;
      bannerUrl?: string | null;
      description?: string;
      joinMode?: "OPEN" | "REQUEST";
      verification?: "NONE" | "STANDARD";
    },
  ) =>
    request<{ community: ApiCommunity }>(`/communities/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  communityJoinRequests: (slug: string) =>
    request<{ requests: ApiCommunityJoinRequest[] }>(
      `/communities/${encodeURIComponent(slug)}/join-requests`,
    ),
  resolveCommunityJoinRequest: (slug: string, requestId: string, approve: boolean) =>
    request<{ ok: boolean }>(
      `/communities/${encodeURIComponent(slug)}/join-requests/${encodeURIComponent(requestId)}`,
      { method: "POST", body: JSON.stringify({ approve }) },
    ),
  joinCommunity: (slug: string) =>
    request<{ community: ApiCommunity }>(`/communities/${encodeURIComponent(slug)}/membership`, {
      method: "PUT",
      body: JSON.stringify({ on: true }),
    }),
  leaveCommunity: (slug: string) =>
    request<{ community: ApiCommunity }>(`/communities/${encodeURIComponent(slug)}/membership`, {
      method: "PUT",
      body: JSON.stringify({ on: false }),
    }),
  setMembership: (slug: string, on: boolean) =>
    request<{ community: ApiCommunity }>(`/communities/${encodeURIComponent(slug)}/membership`, {
      method: "PUT",
      body: JSON.stringify({ on }),
    }),
  listCommunityPosts: (slug: string) =>
    request<{ posts: ApiPost[] }>(`/communities/${encodeURIComponent(slug)}/posts`),

  // Instance settings
  instanceSettings: () =>
    request<{ settings: Record<string, unknown> }>("/instance/settings"),
  updateInstanceSettings: (partial: Record<string, unknown>) =>
    request<{ settings: Record<string, unknown> }>("/instance/settings", {
      method: "PATCH",
      body: JSON.stringify(partial),
    }),

  // Statistics
  instanceStats: () => request<{ stats: InstanceStats }>("/stats/instance"),
  userStats: (username: string) =>
    request<{ stats: UserStats }>(`/stats/user/${encodeURIComponent(username)}`),

  // Community notes
  createNote: (body: { postId: string; body: string; classification?: string; sourceUrl?: string }) =>
    request<{ note: ApiNote }>("/notes", { method: "POST", body: JSON.stringify(body) }),

  // Search
  search: (q: string) =>
    request<{ query: string; users: ApiUser[]; posts: ApiPost[] }>(
      `/search?q=${encodeURIComponent(q)}`,
    ),

  removeAffiliation: (username: string) =>
    request<{ user: ApiUser }>(`/users/${encodeURIComponent(username)}/affiliation`, { method: "DELETE" }),

  listPosts: (author?: string) =>
    request<{ posts: ApiPost[] }>(`/posts${author ? `?author=${encodeURIComponent(author)}` : ""}`),
  getPost: (id: string) => request<{ post: ApiPost }>(`/posts/${encodeURIComponent(id)}`),
  // The author is the signed-in account, taken from the session server-side.
  createPost: (
    content: string,
    options?: {
      replyToId?: string;
      quoteOfId?: string;
      mediaIds?: string[];
      poll?: { options: string[]; durationMinutes: number };
      /** ISO timestamp. Present means the response is a schedule, not a post. */
      scheduledFor?: string;
      /** PUBLIC | FOLLOWERS (mutuals-style) */
      visibility?: "PUBLIC" | "FOLLOWERS";
      /** Post into this community (slug). */
      communitySlug?: string;
    },
  ) =>
    request<{ post?: ApiPost; scheduled?: ScheduledPost }>("/posts", {
      method: "POST",
      body: JSON.stringify({ content, ...options }),
    }),
  votePoll: (postId: string, optionId: string) =>
    request<{ post: ApiPost }>(`/posts/${encodeURIComponent(postId)}/poll/vote`, {
      method: "POST",
      body: JSON.stringify({ optionId }),
    }),
  scheduledPosts: () => request<{ scheduled: ScheduledPost[] }>("/posts/scheduled/mine"),
  cancelScheduled: (id: string) =>
    request<{ cancelled: boolean }>(`/posts/scheduled/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  followingTimeline: () => request<{ posts: ApiPost[] }>("/posts/following"),
  replies: (id: string) => request<{ posts: ApiPost[] }>(`/posts/${encodeURIComponent(id)}/replies`),
  deletePost: (id: string) =>
    request<{ deleted: boolean }>(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  // PUT the state you want: a double tap cannot leave the count drifting.
  setLike: (id: string, on: boolean) =>
    request<{ post: ApiPost }>(`/posts/${encodeURIComponent(id)}/like`, {
      method: "PUT",
      body: JSON.stringify({ on }),
    }),
  setRepost: (id: string, on: boolean) =>
    request<{ post: ApiPost }>(`/posts/${encodeURIComponent(id)}/repost`, {
      method: "PUT",
      body: JSON.stringify({ on }),
    }),

  /** Uploads an avatar or banner and returns the URL to store on the account. */
  uploadMedia: async (file: File, kind: "avatar" | "banner" | "post") => {
    const form = new FormData();
    form.append("file", file);
    // No Content-Type header: the browser must set the multipart boundary.
    const res = await fetch(`/api/media/upload?kind=${kind}`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      throw new ApiError(
        data?.error?.code ?? "UPLOAD_FAILED",
        data?.error?.message ?? `Upload failed (${res.status})`,
        res.status,
      );
    }
    return data as { url: string; id?: string };
  },

  listNotes: (postId?: string) =>
    request<{ notes: ApiNote[] }>(`/notes${postId ? `?postId=${encodeURIComponent(postId)}` : ""}`),
  notesForPost: (postId: string) =>
    request<{ notes: ApiNote[] }>(`/notes?postId=${encodeURIComponent(postId)}&visible=true`),
  // Likewise the rater: one signed-in account is one rating.
  rateNote: (id: string, helpful: boolean) =>
    request<{ note: ApiNote }>(`/notes/${encodeURIComponent(id)}/ratings`, {
      method: "POST",
      body: JSON.stringify({ helpful }),
    }),
};
