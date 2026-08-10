import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ReplyIcon, RepostIcon, LikeIcon, ShareIcon } from "../icons";
import { api } from "../api";
import { CommunityNoteCard } from "../components/CommunityNote";

export function PostPage() {
  const { username, postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Only notes readers rated helpful are attached to the post.
  const { data: noteData } = useQuery({
    queryKey: ["notes", "post", postId],
    queryFn: () => api.notesForPost(postId ?? ""),
    enabled: Boolean(postId),
    retry: false,
  });
  const notes = noteData?.notes ?? [];

  const rate = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      api.rateNote(id, helpful, `reader-${Math.random().toString(36).slice(2, 8)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });

  return (
    <div>
      <header className="x-header gap-6">
        <button type="button" onClick={() => navigate(-1)} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="x-title">Post</h1>
      </header>

      <article className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex gap-3">
          <img src="/assets/default-avatar.svg" alt="" className="avatar w-10 h-10" />
          <div className="min-w-0">
            <p className="font-bold leading-5">@{username}</p>
            <p className="text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
              @{username}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[17px] leading-6" style={{ color: "var(--color-text-secondary)" }}>
          Post <span className="font-mono">{postId}</span> loads from the API once posts exist on this instance.
        </p>

        {notes.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3">
            {notes.map((note) => (
              <CommunityNoteCard
                key={note.id}
                note={note}
                rating={rate.isPending}
                onRate={(helpful) => rate.mutate({ id: note.id, helpful })}
              />
            ))}
            <p className="text-[13px]">
              <Link to="/notes" className="link">
                About Community Notes
              </Link>
            </p>
          </div>
        ) : null}

        <div
          className="flex justify-between max-w-[425px] mt-3 pt-2 border-t"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          {[ReplyIcon, RepostIcon, LikeIcon, ShareIcon].map((Icon, i) => (
            <span key={i} className="icon-btn">
              <Icon className="w-[18px] h-[18px]" />
            </span>
          ))}
        </div>
      </article>

      <div className="empty-state">
        <h2>No replies yet</h2>
        <p>Replies to this post will appear here in the order they were sent.</p>
      </div>
    </div>
  );
}
