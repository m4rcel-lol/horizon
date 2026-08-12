// Shared types, constants, and utilities for Horizon

export const SOFTWARE_NAME = "Horizon";
export const SOFTWARE_VERSION = "0.1.0";

/** Default post length limit (overridable by instance settings) */
export const DEFAULT_POST_MAX_LENGTH = 280;

/** Default media limits */
export const DEFAULT_MAX_MEDIA_PER_POST = 4;
export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    nextCursor?: string | null;
    prevCursor?: string | null;
    hasMore: boolean;
  };
};

/**
 * Verification tiers.
 *
 * Organisation tiers (BUSINESS, GOVERNMENT_BUSINESS) render with a square
 * avatar; individual tiers keep the circular one. Government accounts of both
 * kinds share the same badge and differ only in avatar shape, which is what
 * distinguishes an institution from a person holding office.
 */
export type VerificationType =
  | "NONE"
  | "STANDARD"
  | "BUSINESS"
  | "GOVERNMENT"
  | "GOVERNMENT_BUSINESS";

export type PostVisibility = "PUBLIC" | "FOLLOWERS" | "MENTIONED" | "PRIVATE";

export type AccountStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "DELETED" | "RESTRICTED";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  verification: VerificationType;
  isProtected: boolean;
  createdAt: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

export interface PublicPost {
  id: string;
  content: string;
  visibility: PostVisibility;
  type: "ORIGINAL" | "REPLY" | "REPOST" | "QUOTE";
  sensitive: boolean;
  contentWarning?: string | null;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  bookmarkCount: number;
  viewCount: number;
  createdAt: string;
  editedAt?: string | null;
  author: PublicUser;
  replyToId?: string | null;
  quoteOf?: PublicPost | null;
  repostOf?: PublicPost | null;
  media?: PublicMedia[];
  poll?: PublicPoll | null;
  likedByMe?: boolean;
  repostedByMe?: boolean;
  bookmarkedByMe?: boolean;
}

export interface PublicMedia {
  id: string;
  type: "IMAGE" | "VIDEO" | "GIF" | "AUDIO";
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  blurhash?: string | null;
}

export interface PublicPoll {
  id: string;
  expiresAt: string;
  multiple: boolean;
  options: { id: string; text: string; voteCount: number }[];
  votedOptionIds?: string[];
  totalVotes: number;
  expired: boolean;
}

/** Instance public information */
export interface InstanceInfo {
  name: string;
  description?: string;
  url: string;
  logoUrl?: string;
  software: string;
  version: string;
  registrationEnabled: boolean;
  registrationApprovalRequired: boolean;
  userCount?: number;
  activeUserCount?: number;
  postCount?: number;
  federationEnabled: boolean;
  rules?: { title: string; body: string }[];
  contactEmail?: string;
}

/**
 * Handles nobody may take.
 *
 * Shared because two paths hand out usernames — registration and renaming —
 * and a list that lives in only one of them means a name blocked at sign-up is
 * still reachable by renaming into it.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "api",
  "about",
  "explore",
  "home",
  "login",
  "logout",
  "messages",
  "notifications",
  "notes",
  "settings",
  "setup",
  "register",
  "signup",
  "search",
  "support",
  "help",
  "docs",
  "privacy",
  "terms",
  "root",
  "system",
  "horizon",
  "communities",
  "bookmarks",
  "lists",
  "profile",
  "status",
  "communitynotes",
  "news",
]);

/** Centralized permission keys */
export const PERMISSIONS = {
  USERS_VIEW: "users.view",
  USERS_SUSPEND: "users.suspend",
  USERS_DELETE: "users.delete",
  POSTS_VIEW: "posts.view",
  POSTS_DELETE: "posts.delete",
  REPORTS_VIEW: "reports.view",
  REPORTS_RESOLVE: "reports.resolve",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
  VERIFICATION_GRANT: "verification.grant",
  VERIFICATION_REVOKE: "verification.revoke",
  FEDERATION_MANAGE: "federation.manage",
  SYSTEM_MANAGE: "system.manage",
  MODERATION_MANAGE: "moderation.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export * from "./verification";

export * from "./community-notes";
