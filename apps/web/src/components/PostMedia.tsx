import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, ApiError, type ApiMedia, type ApiPoll } from "../api";
import { useSession } from "../hooks/useSession";

/**
 * Attached images.
 *
 * One fills the width; two to four tile. Clicking opens a lightbox rather than
 * navigating, because the row around it is a link to the post and swallowing
 * that click is the whole point.
 */
export function PostMediaGrid({ media }: { media: ApiMedia[] }) {
  const [open, setOpen] = useState<ApiMedia | null>(null);
  if (media.length === 0) return null;

  return (
    <>
      <div
        className={`mt-3 grid gap-0.5 rounded-2xl overflow-hidden border ${
          media.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
        style={{ borderColor: "var(--color-border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        {media.map((m) => (
          <button
            key={m.id}
            type="button"
            className="block w-full overflow-hidden"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(m);
            }}
            aria-label={m.altText || "Open image"}
          >
            <img
              src={m.url}
              alt={m.altText ?? ""}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.02]"
              style={{ maxHeight: media.length === 1 ? 420 : 200, minHeight: 120 }}
            />
          </button>
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.9)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Image"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(null);
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full text-white text-[20px]"
            style={{ background: "rgba(0,0,0,0.6)" }}
            aria-label="Close"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(null);
            }}
          >
            ✕
          </button>
          <img
            src={open.url}
            alt={open.altText ?? ""}
            className="max-w-full max-h-full object-contain animate-pop-in"
          />
        </div>
      ) : null}
    </>
  );
}

function closesIn(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Final results";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h left`;
  return `${Math.round(hours / 24)}d left`;
}

/**
 * A poll.
 *
 * Choices are buttons until you have voted or it has closed, then they become
 * bars. Showing the tally before someone votes would anchor the answer, which
 * is the one thing a poll should not do.
 */
export function PostPoll({ postId, poll }: { postId: string; poll: ApiPoll }) {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vote = useMutation({
    mutationFn: (optionId: string) => api.votePoll(postId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not record that vote."),
  });

  const showResults = poll.closed || poll.votedOptionId !== null;

  return (
    <div className="mt-3" onClick={(event) => event.stopPropagation()}>
      {poll.options.map((option) => {
        const mine = poll.votedOptionId === option.id;
        return showResults ? (
          <div key={option.id} className="relative mb-2 rounded-lg overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
              style={{
                width: `${option.share}%`,
                background: mine
                  ? "color-mix(in srgb, var(--color-primary) 32%, transparent)"
                  : "var(--color-bg-secondary)",
              }}
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between px-3 py-2 text-[15px]">
              <span className="truncate">
                {option.text}
                {mine ? " ✓" : ""}
              </span>
              <span className="tabular-nums shrink-0 ml-3">{option.share}%</span>
            </div>
          </div>
        ) : (
          <button
            key={option.id}
            type="button"
            disabled={vote.isPending}
            className="block w-full mb-2 px-3 py-2 rounded-full border text-[15px] font-bold transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
            onClick={(event) => {
              event.stopPropagation();
              if (!isAuthenticated) {
                navigate("/login");
                return;
              }
              setError(null);
              vote.mutate(option.id);
            }}
          >
            {option.text}
          </button>
        );
      })}

      <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"} · {closesIn(poll.expiresAt)}
        {poll.votedOptionId && !poll.closed ? " · you can change your vote" : ""}
      </p>
      {error ? (
        <p role="alert" className="text-[13px] mt-1" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
