import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COMMUNITY_NOTES_ACCOUNT,
  COMMUNITY_NOTE_MIN_RATINGS,
  type CommunityNoteStatus,
} from "@horizon/shared";
import { api } from "../api";
import { CommunityNoteCard } from "../components/CommunityNote";

const GROUPS: { status: CommunityNoteStatus; title: string; note: string }[] = [
  {
    status: "HELPFUL",
    title: "Shown on posts",
    note: "Readers rated these helpful, so they appear beneath the post itself.",
  },
  {
    status: "NEEDS_MORE_RATINGS",
    title: "Awaiting ratings",
    note: `Not shown yet. A note needs at least ${COMMUNITY_NOTE_MIN_RATINGS} ratings, and a clear majority calling it helpful.`,
  },
  {
    status: "NOT_HELPFUL",
    title: "Not shown",
    note: "Readers rated these unhelpful, so they never appear on the post.",
  },
];

export function CommunityNotesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notes"], queryFn: () => api.listNotes() });
  const notes = data?.notes ?? [];

  const rate = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      api.rateNote(id, helpful, `reader-${Math.random().toString(36).slice(2, 8)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });

  return (
    <div>
      <header className="x-header">
        <h1 className="x-title">Community Notes</h1>
      </header>

      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Readers write context for posts, and other readers rate whether it helps. A note only appears on the post
          once enough of them agree — no ranking model decides it. Notes are published by{" "}
          <Link to={`/${COMMUNITY_NOTES_ACCOUNT.username}`} className="link">
            @{COMMUNITY_NOTES_ACCOUNT.username}
          </Link>
          .
        </p>
      </div>

      {isLoading ? (
        <p className="px-4 py-6 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
          Loading notes…
        </p>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <h2>No notes yet</h2>
          <p>When a reader adds context to a post, it appears here while other readers rate it.</p>
        </div>
      ) : (
        GROUPS.map((group) => {
          const inGroup = notes.filter((n) => n.status === group.status);
          if (inGroup.length === 0) return null;
          return (
            <section key={group.status} className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <div className="px-4 pt-4">
                <h2 className="text-[20px] font-extrabold">{group.title}</h2>
                <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {group.note}
                </p>
              </div>
              <ul className="px-4 py-4 flex flex-col gap-3">
                {inGroup.map((note) => (
                  <li key={note.id}>
                    <CommunityNoteCard
                      note={note}
                      showStatus
                      rating={rate.isPending}
                      onRate={(helpful) => rate.mutate({ id: note.id, helpful })}
                    />
                    <p className="mt-1 text-[13px]">
                      <Link to={`/post/status/${note.postId}`} className="link">
                        View the post this note is on
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
