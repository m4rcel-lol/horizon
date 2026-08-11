import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreIcon } from "../icons";
import { api, type ApiUser } from "../api";
import { useSession } from "../hooks/useSession";
import { PERMISSIONS } from "@horizon/shared";

/**
 * The overflow menu on a profile.
 *
 * Every entry here does something real. Mute is still absent for the reason
 * Block used to be: it is modelled in the schema with nothing behind it, and a
 * menu item that silently does nothing is worse than its absence.
 */
export function ProfileMenu({ user }: { user: ApiUser | undefined }) {
  const navigate = useNavigate();
  const { active, can } = useSession();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: relationship } = useQuery({
    queryKey: ["relationship", user?.username],
    queryFn: () => api.relationship(user!.username),
    enabled: Boolean(user) && active?.username !== user?.username,
    retry: false,
  });

  const block = useMutation({
    mutationFn: (on: boolean) => api.setBlock(user!.username, on),
    onSuccess: () => {
      // Blocking drops any follow between the two, so the counts and the
      // follow button are both stale until these refetch.
      queryClient.invalidateQueries({ queryKey: ["relationship", user?.username] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

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

          {!isSelf && active && !user.isSystem ? (
            <button
              type="button"
              role="menuitem"
              className={item}
              disabled={block.isPending}
              style={relationship?.blocking ? undefined : { color: "var(--color-danger, #f91880)" }}
              onClick={() => {
                setOpen(false);
                block.mutate(!relationship?.blocking);
              }}
            >
              {relationship?.blocking ? `Unblock @${user.username}` : `Block @${user.username}`}
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
