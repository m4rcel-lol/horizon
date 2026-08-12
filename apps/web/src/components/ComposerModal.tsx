import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type ApiPost, type ApiUser } from "../api";
import { Avatar } from "./Verification";
import { QuotedPost } from "./PostCard";
import { useSession } from "../hooks/useSession";

export type ComposerTarget =
  | { mode: "reply" | "quote"; post: ApiPost }
  /**
   * A plain post opened with someone already mentioned.
   *
   * This is what the profile's Message button becomes when an account has
   * direct messages turned off: there is still a way to reach them in public,
   * which is the point of offering it instead of a dead button.
   */
  | { mode: "mention"; user: ApiUser }
  | null;

const MAX = 500;

/**
 * Writing a reply or a quote.
 *
 * Both are the same form over the same endpoint — the difference is one field
 * on the request and what is shown above or below the box. A reply shows who
 * it answers; a quote shows the post being quoted, in the card it will keep
 * once posted, so what you see while writing is what appears afterwards.
 */
export function ComposerModal({
  target,
  onClose,
}: {
  target: ComposerTarget;
  onClose: () => void;
}) {
  const { active } = useSession();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!target) return;
    setText(target.mode === "mention" ? `@${target.user.username} ` : "");
    setError(null);
    const focus = window.setTimeout(() => box.current?.focus(), 50);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focus);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [target, onClose]);

  const send = useMutation({
    mutationFn: (content: string) =>
      api.createPost(
        content,
        target?.mode === "reply"
          ? { replyToId: target.post.id }
          : target?.mode === "quote"
            ? { quoteOfId: target.post.id }
            : {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      queryClient.invalidateQueries({ queryKey: ["replies"] });
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not post that."),
  });

  if (!target) return null;
  const isReply = target.mode === "reply";
  const isMention = target.mode === "mention";
  const remaining = MAX - text.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[6vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label={isReply ? "Write a reply" : isMention ? "Mention someone" : "Quote this post"}
    >
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />

      <div
        className="relative w-full max-w-[600px] max-h-[86vh] overflow-y-auto rounded-2xl border shadow-xl"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
      >
        <div
          className="sticky top-0 flex items-center gap-4 px-4 py-3 border-b z-10"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
        >
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <h2 className="flex-1 text-[17px] font-extrabold">
            {isReply ? "Reply" : isMention ? "New post" : "Quote"}
          </h2>
        </div>

        <div className="px-4 py-3">
          {isReply && target.mode === "reply" ? (
            <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Replying to <span className="link">@{target.post.authorUsername}</span>
            </p>
          ) : null}

          <div className="flex gap-3">
            <Avatar
              shape={active?.avatarShape ?? "circle"}
              size={40}
              src={active?.avatarUrl || "/assets/default-avatar.svg"}
            />
            <div className="flex-1 min-w-0">
              <textarea
                ref={box}
                className="w-full bg-transparent text-[18px] leading-6 outline-none resize-none"
                style={{ minHeight: 90 }}
                placeholder={
                  isReply ? "Post your reply" : isMention ? "What's happening?" : "Add a comment"
                }
                maxLength={MAX}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />

              {/* What is being quoted, in the same card it keeps once posted. */}
              {target.mode === "quote" ? <QuotedPost post={target.post} /> : null}
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 text-[14px] rounded-2xl p-3"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-danger)" }}
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 mt-3">
            <span
              className="text-[13px] tabular-nums"
              style={{ color: remaining < 20 ? "var(--color-danger)" : "var(--color-text-secondary)" }}
            >
              {remaining}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!text.trim() || send.isPending}
              onClick={() => send.mutate(text.trim())}
            >
              {send.isPending ? "Posting…" : isReply ? "Reply" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
