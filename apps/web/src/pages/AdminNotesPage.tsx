import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { COMMUNITY_NOTE_CLASSIFICATIONS, COMMUNITY_NOTE_CLASSIFICATION_LABELS } from "@horizon/shared";
import { api, ApiError } from "../api";
import { PageLoader } from "../components/LoadingSpinner";

/**
 * Writing a Community Note as an administrator.
 *
 * The note is attributed to the account that wrote it, exactly like any
 * reader's — an administrator's note is not privileged, and it has to clear
 * the same rating threshold before it shows on the post. This page is a way in,
 * not a way around.
 */
export function AdminNotesPage() {
  const queryClient = useQueryClient();
  const [postId, setPostId] = useState("");
  const [body, setBody] = useState("");
  const [classification, setClassification] = useState<string>("MISSING_CONTEXT");
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["notes"], queryFn: () => api.listNotes() });
  const notes = data?.notes ?? [];

  // How many ratings resolve a note here. Three suits a busy instance and is
  // unreachable on a small one, where every note would sit pending forever.
  const { data: settings } = useQuery({
    queryKey: ["instance-settings"],
    queryFn: api.instanceSettings,
    retry: false,
  });
  const minRatings = Number(settings?.settings?.["notes.minRatings"] ?? 3);
  const [threshold, setThreshold] = useState<number | null>(null);
  const saveThreshold = useMutation({
    mutationFn: (value: number) => api.updateInstanceSettings({ "notes.minRatings": value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instance-settings"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  // Look the post up as the id is typed, so a typo is obvious before writing
  // 600 characters about the wrong thing.
  const { data: target } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => api.getPost(postId),
    enabled: postId.trim().length > 10,
    retry: false,
  });

  const write = useMutation({
    mutationFn: () =>
      api.createNote({
        postId: postId.trim(),
        body: body.trim(),
        classification,
        ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
      }),
    onSuccess: () => {
      setDone("Note written. It shows on the post once readers rate it helpful.");
      setPostId("");
      setBody("");
      setSourceUrl("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e) => {
      setDone(null);
      setError(e instanceof ApiError ? e.message : "Could not write that note.");
    },
  });

  const canWrite = postId.trim().length > 0 && body.trim().length >= 10;

  return (
    <div className="animate-fade-in">
      <section
        className="rounded-2xl border p-4 mb-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h2 className="text-[17px] font-extrabold mb-1">Write a note</h2>
        <p className="text-[14px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
          Notes are attributed to you and published by @CommunityNotes. Yours is rated like anyone
          else&apos;s — it appears on the post only once readers agree it helps.
        </p>

        <label htmlFor="note-post" className="x-label">
          Post id
        </label>
        <input
          id="note-post"
          className="x-field"
          placeholder="Paste the id from the post's URL"
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
        />
        {target?.post ? (
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            @{target.post.authorUsername}: “{target.post.content.slice(0, 90)}
            {target.post.content.length > 90 ? "…" : ""}”{" "}
            <Link to={`/${target.post.authorUsername}/status/${target.post.id}`} className="link">
              open
            </Link>
          </p>
        ) : postId.trim().length > 10 ? (
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-danger)" }}>
            No post with that id.
          </p>
        ) : null}

        <div className="mt-4">
          <label htmlFor="note-class" className="x-label">
            What is wrong with it
          </label>
          <select
            id="note-class"
            className="x-field"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
          >
            {COMMUNITY_NOTE_CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {COMMUNITY_NOTE_CLASSIFICATION_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label htmlFor="note-body" className="x-label">
            The note
          </label>
          <textarea
            id="note-body"
            className="x-field min-h-[110px] resize-y"
            maxLength={600}
            placeholder="What readers should know, and why."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {600 - body.length} characters left. At least 10.
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="note-source" className="x-label">
            Source (optional)
          </label>
          <input
            id="note-source"
            className="x-field"
            placeholder="https://…"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-[14px]" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        ) : null}
        {done ? (
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-primary)" }}>
            {done}
          </p>
        ) : null}

        <div className="flex justify-end mt-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canWrite || write.isPending}
            onClick={() => write.mutate()}
          >
            {write.isPending ? "Writing…" : "Write note"}
          </button>
        </div>
      </section>

      <section
        className="rounded-2xl border p-4 mb-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h2 className="text-[17px] font-extrabold mb-1">How many ratings resolve a note</h2>
        <p className="text-[14px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
          A note needs this many ratings before readers&apos; verdict counts, and two thirds of them
          must be helpful for it to show on the timeline. Three suits a busy instance; on a small one
          it is unreachable, and every note sits pending forever.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="min-ratings" className="text-[14px]">
            Ratings required
          </label>
          <input
            id="min-ratings"
            type="number"
            min={1}
            max={50}
            className="x-field !w-24"
            value={threshold ?? minRatings}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={threshold === null || threshold === minRatings || saveThreshold.isPending}
            onClick={() => threshold !== null && saveThreshold.mutate(threshold)}
          >
            {saveThreshold.isPending ? "Saving…" : "Save"}
          </button>
          {saveThreshold.isSuccess && threshold === minRatings ? (
            <span className="text-[14px]" style={{ color: "var(--color-primary)" }}>
              Saved. Existing notes re-resolve as they are next rated.
            </span>
          ) : null}
        </div>
      </section>

      <h2 className="text-[17px] font-extrabold mb-2">Existing notes</h2>
      {isLoading ? (
        <PageLoader label="Loading notes…" />
      ) : notes.length === 0 ? (
        <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Nobody has written a note on this instance yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-2xl border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 flex-wrap text-[13px]">
                <span
                  className="px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background:
                      n.status === "HELPFUL"
                        ? "color-mix(in srgb, var(--color-success, #00ba7c) 18%, transparent)"
                        : n.status === "NOT_HELPFUL"
                          ? "color-mix(in srgb, var(--color-danger, #f91880) 18%, transparent)"
                          : "var(--color-bg-secondary)",
                  }}
                >
                  {n.statusLabel}
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>{n.classificationLabel}</span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {n.helpfulCount} helpful · {n.notHelpfulCount} not · {n.ratingsNeeded} more needed
                </span>
                {n.author ? (
                  <span style={{ color: "var(--color-text-secondary)" }}>by @{n.author}</span>
                ) : null}
              </div>
              <p className="mt-2 text-[15px]">{n.body}</p>
              <p className="mt-1 text-[13px]">
                <Link to={`/i/status/${n.postId}`} className="link">
                  See the post
                </Link>
                {n.sourceUrl ? (
                  <>
                    {" · "}
                    <a href={n.sourceUrl} className="link" target="_blank" rel="noreferrer noopener">
                      Source
                    </a>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
