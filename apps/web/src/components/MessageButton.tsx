import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessagesIcon } from "../icons";
import { api, ApiError, type ApiUser } from "../api";
import { useSession } from "../hooks/useSession";

/**
 * Message, or Mention when messaging is closed.
 *
 * An account that has turned direct messages off should not show a button that
 * fails when pressed — but it should not simply vanish either, because there is
 * still a public way to reach that person. So the control changes into a
 * mention, which opens the composer with their handle already in it.
 *
 * The server decides which of the two this is: the rules involve the other
 * person's setting, whether they follow back, and whether they have blocked
 * you, none of which the client can work out on its own.
 */
export function MessageButton({
  user,
  onMention,
}: {
  user: ApiUser;
  onMention: () => void;
}) {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["can-message", user.username],
    queryFn: () => api.canMessage(user.username),
    enabled: isAuthenticated,
    retry: false,
  });

  const open = useMutation({
    mutationFn: () => api.createConversation([user.username]),
    onSuccess: ({ conversation }) => navigate(`/messages/${conversation.id}`),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not open that conversation."),
  });

  if (!isAuthenticated || data?.reason === "self") return null;

  // Until the answer arrives, offer the ordinary action rather than flickering
  // between two different buttons.
  const allowed = data?.allowed ?? true;

  if (!allowed) {
    return (
      <button
        type="button"
        className="btn btn-outline"
        title={
          data?.reason === "blocked"
            ? `@${user.username} does not accept messages from you`
            : `@${user.username} does not have messages open — mention them instead`
        }
        onClick={onMention}
      >
        Mention
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        className="icon-btn border"
        style={{ borderColor: "var(--color-border-strong)" }}
        aria-label={`Message @${user.username}`}
        disabled={open.isPending}
        onClick={() => {
          setError(null);
          open.mutate();
        }}
      >
        <MessagesIcon className="w-4 h-4" />
      </button>
      {error ? (
        <span role="alert" className="mt-1 text-[12px]" style={{ color: "var(--color-danger)" }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
