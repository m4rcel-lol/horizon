import { useEffect, useRef, useState } from "react";
import {
  PROFILE_IMAGE_ACCEPT,
  previewUrl,
  validateProfileImage,
} from "../lib/profileMedia";

type Props = {
  open: boolean;
  onClose: () => void;
  displayName: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  onSave?: (payload: {
    displayName: string;
    bio: string;
    avatarFile?: File | null;
    bannerFile?: File | null;
  }) => void | Promise<void>;
};

/**
 * Edit profile: display name, bio, avatar, banner.
 * Avatar and banner accept JPEG, PNG, WebP, and GIF (animated GIFs allowed).
 */
export function EditProfileModal({
  open,
  onClose,
  displayName: initialName,
  bio: initialBio = "",
  avatarUrl,
  bannerUrl,
  onSave,
}: Props) {
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialName);
    setBio(initialBio);
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview(null);
    setBannerPreview(null);
    setError(null);
  }, [open, initialName, initialBio]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [avatarPreview, bannerPreview]);

  if (!open) return null;

  function onPickAvatar(file: File | undefined) {
    if (!file) return;
    const result = validateProfileImage(file, "avatar");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(result.file);
    setAvatarPreview(previewUrl(result.file));
  }

  function onPickBanner(file: File | undefined) {
    if (!file) return;
    const result = validateProfileImage(file, "banner");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(result.file);
    setBannerPreview(previewUrl(result.file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave?.({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarFile,
        bannerFile,
      });
      // Parent closes on success; keep open on error.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl border shadow-xl"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
      >
        <div
          className="sticky top-0 flex items-center gap-4 px-4 py-3 border-b z-10"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
        >
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <h2 id="edit-profile-title" className="flex-1 text-[20px] font-extrabold">
            Edit profile
          </h2>
          <button type="submit" className="btn btn-primary !py-1.5 !px-4 text-[14px]" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Banner */}
        <div className="relative h-[200px]" style={{ background: "var(--color-bg-secondary)" }}>
          {(bannerPreview || bannerUrl) && (
            <img
              src={bannerPreview || bannerUrl || ""}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/30">
            <button
              type="button"
              className="icon-btn !bg-black/60 !text-white"
              onClick={() => bannerInput.current?.click()}
              aria-label="Upload banner"
            >
              📷
            </button>
          </div>
          <input
            ref={bannerInput}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => onPickBanner(e.target.files?.[0])}
          />
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-[66px] mb-4 relative z-[1]">
          <div className="relative inline-block">
            <img
              src={avatarPreview || avatarUrl || "/assets/default-avatar.svg"}
              alt=""
              className="w-[133px] h-[133px] rounded-full object-cover border-4"
              style={{ borderColor: "var(--color-bg)", background: "var(--color-bg-secondary)" }}
            />
            <button
              type="button"
              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
              onClick={() => avatarInput.current?.click()}
              aria-label="Upload avatar"
            >
              📷
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept={PROFILE_IMAGE_ACCEPT}
              className="hidden"
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
            />
          </div>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            JPEG, PNG, WebP, or <strong style={{ color: "var(--color-text)" }}>GIF</strong> for
            avatar and banner.
          </p>
        </div>

        <div className="px-4 pb-6 space-y-4">
          <div>
            <label htmlFor="edit-name" className="x-label">
              Display name
            </label>
            <input
              id="edit-name"
              className="x-field"
              value={displayName}
              maxLength={50}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="edit-bio" className="x-label">
              Bio
            </label>
            <textarea
              id="edit-bio"
              className="x-field min-h-[100px] resize-y"
              value={bio}
              maxLength={500}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-[14px] text-red-500" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
