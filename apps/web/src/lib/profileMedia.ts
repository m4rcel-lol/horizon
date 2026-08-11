/**
 * Profile avatar & banner validation.
 * GIFs are explicitly allowed for both avatars and banners.
 */

export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const PROFILE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileImageKind = "avatar" | "banner";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB (GIFs can be larger than stills)
const MAX_BANNER_BYTES = 10 * 1024 * 1024;

export function maxBytesFor(kind: ProfileImageKind): number {
  return kind === "avatar" ? MAX_AVATAR_BYTES : MAX_BANNER_BYTES;
}

export type ProfileMediaValidation =
  | { ok: true; file: File; isGif: boolean }
  | { ok: false; error: string };

/**
 * Validate a user-selected file for avatar or banner.
 * Trust MIME from the browser as a first pass; the server must still
 * check magic bytes when upload is implemented.
 */
export function validateProfileImage(
  file: File,
  kind: ProfileImageKind,
): ProfileMediaValidation {
  const type = (file.type || "").toLowerCase();
  if (!PROFILE_IMAGE_MIME_TYPES.includes(type as (typeof PROFILE_IMAGE_MIME_TYPES)[number])) {
    return {
      ok: false,
      error: "Use JPEG, PNG, WebP, or GIF.",
    };
  }
  const max = maxBytesFor(kind);
  if (file.size > max) {
    return {
      ok: false,
      error: `File is too large (max ${Math.round(max / (1024 * 1024))} MB for ${kind}).`,
    };
  }
  return { ok: true, file, isGif: type === "image/gif" };
}

/** Local object URL for preview; caller should revoke when done. */
export function previewUrl(file: File): string {
  return URL.createObjectURL(file);
}
