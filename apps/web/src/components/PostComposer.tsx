import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MediaIcon, PollIcon, EmojiIcon, ScheduleIcon } from "../icons";
import { api, ApiError } from "../api";
import { useSession } from "../hooks/useSession";
import { Avatar } from "./Verification";
import { EmojiPicker } from "./EmojiPicker";
import { PROFILE_IMAGE_ACCEPT, validateProfileImage } from "../lib/profileMedia";

const MAX_TEXT = 500;
const MAX_IMAGES = 4;

type Attachment = { file: File; preview: string; id?: string };

const POLL_DURATIONS = [
  { label: "5 minutes", minutes: 5 },
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 1440 },
  { label: "3 days", minutes: 4320 },
  { label: "1 week", minutes: 10080 },
];

/** `datetime-local` wants a local-time string with no zone suffix. */
function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Writing a post: text, images, a poll, emoji, and scheduling.
 *
 * The four buttons under the box used to be decorative spans. Each one now
 * opens the thing it depicts, and the state they collect is submitted with the
 * post.
 *
 * Images and a poll are mutually exclusive, which the API enforces too — the
 * buttons disable each other so the refusal never has to be shown.
 */
export function PostComposer({
  placeholder = "What's happening?",
  onPosted,
}: {
  placeholder?: string;
  onPosted?: () => void;
}) {
  const { active } = useSession();
  const queryClient = useQueryClient();
  const box = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [poll, setPoll] = useState<{ options: string[]; minutes: number } | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The rail's Post button links to #composer; focus it on arrival.
  useEffect(() => {
    if (window.location.hash === "#composer") box.current?.focus();
  }, []);

  // Object URLs are only valid while the page lives; release them with it.
  useEffect(
    () => () => attachments.forEach((a) => URL.revokeObjectURL(a.preview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const reset = () => {
    attachments.forEach((a) => URL.revokeObjectURL(a.preview));
    setText("");
    setAttachments([]);
    setPoll(null);
    setScheduledFor(null);
    setError(null);
  };

  const publish = useMutation({
    mutationFn: async () => {
      // Upload first: a post referencing an upload that failed would render
      // a broken image, so nothing is created until every file is stored.
      const mediaIds: string[] = [];
      for (const a of attachments) {
        const { id } = await api.uploadMedia(a.file, "post");
        if (id) mediaIds.push(id);
      }
      return api.createPost(text.trim(), {
        ...(mediaIds.length ? { mediaIds } : {}),
        ...(poll ? { poll: { options: poll.options, durationMinutes: poll.minutes } } : {}),
        ...(scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
      });
    },
    onSuccess: (result) => {
      const wasScheduled = Boolean(result.scheduled);
      reset();
      setNotice(
        wasScheduled
          ? `Scheduled for ${new Date(result.scheduled!.scheduledFor).toLocaleString()}.`
          : null,
      );
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled"] });
      onPosted?.();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not publish that."),
  });

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_IMAGES - attachments.length;
    if (room <= 0) {
      setError(`A post can carry up to ${MAX_IMAGES} images.`);
      return;
    }
    const next: Attachment[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const result = validateProfileImage(file, "banner");
      if (!result.ok) {
        setError(result.error);
        continue;
      }
      next.push({ file: result.file, preview: URL.createObjectURL(result.file) });
    }
    if (next.length) setAttachments((a) => [...a, ...next]);
  }

  function insertEmoji(emoji: string) {
    const el = box.current;
    if (!el) {
      setText((t) => t + emoji);
      return;
    }
    // Insert at the caret rather than appending, so it lands where you are.
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next.slice(0, MAX_TEXT));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  }

  const remaining = MAX_TEXT - text.length;
  const hasSomething = text.trim().length > 0 || attachments.length > 0 || Boolean(poll);
  const pollValid = !poll || poll.options.filter((o) => o.trim()).length >= 2;
  const canPost = hasSomething && pollValid && !publish.isPending;

  if (!active) return null;

  return (
    <div className="flex gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
      <Avatar
        shape={active.avatarShape}
        size={40}
        src={active.avatarUrl || "/assets/default-avatar.svg"}
      />
      <div className="flex-1 min-w-0">
        <textarea
          id="composer"
          ref={box}
          rows={2}
          placeholder={placeholder}
          aria-label="Post text"
          maxLength={MAX_TEXT}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-transparent text-[20px] outline-none resize-none placeholder:text-[var(--color-text-secondary)] py-2"
        />

        {attachments.length > 0 ? (
          <div
            className={`grid gap-2 mt-2 ${attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {attachments.map((a, i) => (
              <div
                key={a.preview}
                // A floor on the height so the remove control stays reachable
                // even if the file turns out not to decode: an image that
                // renders at zero would otherwise hide the only way to drop it.
                className="relative rounded-2xl overflow-hidden animate-pop-in"
                style={{ minHeight: 88, background: "var(--color-bg-secondary)" }}
              >
                <img
                  src={a.preview}
                  alt=""
                  className="w-full object-cover"
                  style={{ maxHeight: attachments.length === 1 ? 320 : 160 }}
                />
                <button
                  type="button"
                  aria-label={`Remove image ${i + 1}`}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                  onClick={() => {
                    URL.revokeObjectURL(a.preview);
                    setAttachments((list) => list.filter((x) => x !== a));
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {poll ? (
          <div
            className="mt-3 rounded-2xl border p-3 animate-pop-in"
            style={{ borderColor: "var(--color-border)" }}
          >
            {poll.options.map((option, i) => (
              <div key={i} className="mb-2">
                <label className="sr-only" htmlFor={`poll-option-${i}`}>
                  Choice {i + 1}
                </label>
                <input
                  id={`poll-option-${i}`}
                  className="x-field"
                  placeholder={`Choice ${i + 1}`}
                  maxLength={40}
                  value={option}
                  onChange={(e) =>
                    setPoll((p) =>
                      p
                        ? { ...p, options: p.options.map((o, j) => (j === i ? e.target.value : o)) }
                        : p,
                    )
                  }
                />
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 mt-1">
              {poll.options.length < 4 ? (
                <button
                  type="button"
                  className="link text-[14px]"
                  onClick={() => setPoll((p) => (p ? { ...p, options: [...p.options, ""] } : p))}
                >
                  Add a choice
                </button>
              ) : null}
              <label className="text-[14px] flex items-center gap-2 ml-auto">
                <span style={{ color: "var(--color-text-secondary)" }}>Closes after</span>
                <select
                  className="x-field !py-1 !px-2 !w-auto"
                  value={poll.minutes}
                  onChange={(e) => setPoll((p) => (p ? { ...p, minutes: Number(e.target.value) } : p))}
                >
                  {POLL_DURATIONS.map((d) => (
                    <option key={d.minutes} value={d.minutes}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="text-[14px]"
                style={{ color: "var(--color-danger, #f91880)" }}
                onClick={() => setPoll(null)}
              >
                Remove poll
              </button>
            </div>
          </div>
        ) : null}

        {scheduledFor ? (
          <p
            className="mt-2 text-[14px] flex items-center gap-2 animate-fade-in"
            style={{ color: "var(--color-primary)" }}
          >
            <ScheduleIcon className="w-4 h-4" />
            Will publish {new Date(scheduledFor).toLocaleString()}
            <button
              type="button"
              className="link"
              onClick={() => setScheduledFor(null)}
              aria-label="Post now instead"
            >
              Post now instead
            </button>
          </p>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1 relative" style={{ color: "var(--color-primary)" }}>
            <button
              type="button"
              className="icon-btn hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] disabled:opacity-40"
              aria-label="Add images"
              title={poll ? "A post carries images or a poll, not both" : "Add images"}
              disabled={Boolean(poll) || attachments.length >= MAX_IMAGES}
              onClick={() => fileInput.current?.click()}
            >
              <MediaIcon className="w-5 h-5" />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={PROFILE_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              className="icon-btn hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] disabled:opacity-40"
              aria-label="Add a poll"
              title={attachments.length ? "A post carries images or a poll, not both" : "Add a poll"}
              disabled={attachments.length > 0}
              onClick={() => setPoll((p) => (p ? null : { options: ["", ""], minutes: 1440 }))}
            >
              <PollIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              className="icon-btn hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
              aria-label="Add an emoji"
              aria-expanded={emojiOpen}
              onClick={() => setEmojiOpen((o) => !o)}
            >
              <EmojiIcon className="w-5 h-5" />
            </button>
            {emojiOpen ? (
              <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />
            ) : null}

            <button
              type="button"
              className="icon-btn hover:bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] disabled:opacity-40"
              aria-label="Schedule this post"
              aria-expanded={scheduleOpen}
              title={poll ? "A poll's timer starts when it is posted, so it cannot be scheduled" : "Schedule"}
              disabled={Boolean(poll)}
              onClick={() => setScheduleOpen((o) => !o)}
            >
              <ScheduleIcon className="w-5 h-5" />
            </button>
            {scheduleOpen ? (
              <div
                className="absolute left-0 top-full mt-2 z-50 w-[280px] rounded-2xl border shadow-xl p-3 animate-pop-in"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  boxShadow: "0 0 15px rgba(0,0,0,0.2)",
                }}
              >
                <label htmlFor="schedule-at" className="block text-[14px] font-bold mb-2">
                  Publish at
                </label>
                <input
                  id="schedule-at"
                  type="datetime-local"
                  className="x-field"
                  min={localInputValue(new Date(Date.now() + 60_000))}
                  defaultValue={scheduledFor ?? localInputValue(new Date(Date.now() + 3600_000))}
                  onChange={(e) => setScheduledFor(e.target.value || null)}
                />
                <div className="flex justify-end gap-3 mt-3">
                  <button type="button" className="link text-[14px]" onClick={() => setScheduleOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {text.length > 0 ? (
              <span
                className="text-[13px] tabular-nums"
                style={{
                  color: remaining < 20 ? "var(--color-danger)" : "var(--color-text-secondary)",
                }}
              >
                {remaining}
              </span>
            ) : null}
            <button
              type="button"
              className="btn btn-primary px-4"
              disabled={!canPost}
              onClick={() => publish.mutate()}
            >
              {publish.isPending ? "Posting…" : scheduledFor ? "Schedule" : "Post"}
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-[14px] mt-2 animate-fade-in" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="text-[14px] mt-2 animate-fade-in" style={{ color: "var(--color-primary)" }}>
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
