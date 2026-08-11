import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreIcon } from "../icons";
import type { ApiUser } from "../api";
import { useSession } from "../hooks/useSession";
import { PERMISSIONS } from "@horizon/shared";

/**
 * The overflow menu on a profile.
 *
 * It was a button with no handler. Every entry here does something real —
 * nothing is listed that would not work, which is why there is no Block or
 * Mute: those are modelled in the schema but have no implementation behind
 * them, and a menu item that silently does nothing is worse than its absence.
 */
export function ProfileMenu({ user }: { user: ApiUser | undefined }) {
  const navigate = useNavigate();
  const { active, can } = useSession();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const isSelf = active?.username === user.username;

  const copy = (text: string, note: string) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(note);
        window.setTimeout(() => setCopied(null), 1500);
      },
      () => setCopied("Could not copy"),
    );
    setOpen(false);
  };

  const item =
    "flex items-center gap-3 w-full px-4 py-3 text-left text-[15px] font-bold hover:bg-[var(--color-bg-secondary)]";

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className="icon-btn border"
        style={{ borderColor: "var(--color-border-strong)" }}
        aria-label={`More options for @${user.username}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreIcon className="w-4 h-4" />
      </button>

      {copied ? (
        <span
          role="status"
          className="absolute right-0 top-full mt-1 whitespace-nowrap rounded px-2 py-1 text-[13px] animate-fade-in z-50"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          {copied}
        </span>
      ) : null}

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-[260px] rounded-2xl border shadow-xl z-[200] overflow-hidden animate-pop-in"
          style={{
            background: "var(--color-bg)",
            borderColor: "var(--color-border)",
            boxShadow: "0 0 15px rgba(0,0,0,0.2)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() =>
              copy(`${window.location.origin}/${user.username}`, "Link copied")
            }
          >
            Copy link to profile
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => copy(`@${user.username}`, "Handle copied")}
          >
            Copy @{user.username}
          </button>

          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              navigate(`/${user.username}/stats`);
            }}
          >
            View statistics
          </button>

          {user.affiliateCount > 0 ? (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false);
                navigate(`/${user.username}/affiliates`);
              }}
            >
              See affiliated accounts
            </button>
          ) : null}

          {isSelf ? (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false);
                navigate("/settings");
              }}
            >
              Settings and privacy
            </button>
          ) : null}

          {/* Administrators get the moderation route from where they are. */}
          {can(PERMISSIONS.VERIFICATION_GRANT) && !user.isSystem ? (
            <button
              type="button"
              role="menuitem"
              className={item}
              style={{ color: "var(--color-primary)" }}
              onClick={() => {
                setOpen(false);
                navigate(`/admin/verification?u=${encodeURIComponent(user.username)}`);
              }}
            >
              Manage verification
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
