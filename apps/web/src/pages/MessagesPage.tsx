import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ComposeIcon, MessagesIcon } from "../icons";
import { api, ApiError, type ApiConversation, type ApiUser } from "../api";
import { Avatar, NameWithBadges } from "../components/Verification";
import { useSession } from "../hooks/useSession";
import { PageLoader } from "../components/LoadingSpinner";

function relativeTime(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A one-to-one thread is named by the other person; a group by its title. */
function conversationName(c: ApiConversation): string {
  if (c.title) return c.title;
  if (c.others.length === 0) return "Empty conversation";
  if (c.others.length === 1) return c.others[0].displayName;
  return c.others.map((o) => o.displayName).join(", ");
}

/**
 * The inbox.
 *
 * This page was an empty state with a button that did nothing, over models that
 * had been in the schema from the start.
 */
export function MessagesPage() {
  const { isAuthenticated } = useSession();
  const [composing, setComposing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: api.conversations,
    enabled: isAuthenticated,
    // A thread is a conversation with someone who is typing right now, so the
    // list is worth keeping close to live without a socket to maintain.
    refetchInterval: 15_000,
    retry: false,
  });

  const conversations = data?.conversations ?? [];

  if (!isAuthenticated) {
    return (
      <div>
        <header className="x-header">
          <h1 className="x-title">Messages</h1>
        </header>
        <div className="empty-state">
          <h2>Sign in to see your messages</h2>
          <p className="mb-6">Direct messages are private conversations between you and other people.</p>
          <Link to="/login" className="btn btn-primary btn-lg">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="x-header justify-between">
        <h1 className="x-title">Messages</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label="New message"
          onClick={() => setComposing(true)}
        >
          <ComposeIcon className="w-5 h-5" />
        </button>
      </header>

      {isLoading ? (
        <PageLoader label="Loading conversations…" />
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <h2>Welcome to your inbox</h2>
          <p className="mb-6">
            Direct messages are private conversations between you and other people.
          </p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setComposing(true)}>
            Write a message
          </button>
        </div>
      ) : (
        <ul className="animate-fade-in">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                to={`/messages/${c.id}`}
                className="flex gap-3 px-4 py-3 border-b transition-colors hover:bg-[var(--color-row-hover)]"
                style={{
                  borderColor: "var(--color-border)",
                  background: c.unreadCount > 0 ? "var(--color-bg-secondary)" : undefined,
                }}
              >
                <ConversationAvatar conversation={c} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold truncate">{conversationName(c)}</span>
                    {c.isGroup ? (
                      <span className="text-[13px] shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                        {c.memberCount}
                      </span>
                    ) : null}
                    {c.lastMessageAt ? (
                      <span
                        className="text-[13px] shrink-0 ml-auto"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {relativeTime(c.lastMessageAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[14px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                    {c.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
                {c.unreadCount > 0 ? (
                  <span
                    className="shrink-0 self-center rounded-full text-[12px] font-bold px-2 py-0.5"
                    style={{ background: "var(--color-primary)", color: "#fff" }}
                    aria-label={`${c.unreadCount} unread`}
                  >
                    {c.unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {composing ? <NewConversationModal onClose={() => setComposing(false)} /> : null}
    </div>
  );
}

function ConversationAvatar({ conversation }: { conversation: ApiConversation }) {
  const first = conversation.others[0];
  if (conversation.isGroup) {
    return (
      <span
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-secondary)",
        }}
      >
        <MessagesIcon className="w-6 h-6" />
      </span>
    );
  }
  return (
    <Avatar
      shape={first?.avatarShape ?? "circle"}
      size={48}
      src={first?.avatarUrl || "/assets/default-avatar.svg"}
    />
  );
}

/**
 * Start a conversation.
 *
 * Handles are typed rather than picked from a list of everyone, because the
 * permission check is the server's and the list would have to lie about who
 * can actually be reached.
 */
function NewConversationModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [handles, setHandles] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.createConversation(
        handles
          .split(/[,\s]+/)
          .map((h) => h.replace(/^@/, "").trim())
          .filter(Boolean),
        title.trim() || undefined,
      ),
    onSuccess: ({ conversation }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
      navigate(`/messages/${conversation.id}`);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not start that conversation."),
  });

  const names = handles.split(/[,\s]+/).filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="New message"
        className="w-full max-w-[440px] rounded-2xl border p-4 animate-pop-in"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[20px] font-extrabold mb-3">New message</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            create.mutate();
          }}
        >
          <label className="block mb-3">
            <span className="block text-[14px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
              To — one handle, or several for a group
            </span>
            <input
              className="x-field"
              autoFocus
              placeholder="@alice @bob"
              value={handles}
              onChange={(e) => setHandles(e.target.value)}
            />
          </label>
          {names.length > 1 ? (
            <label className="block mb-3">
              <span className="block text-[14px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Group name (optional)
              </span>
              <input
                className="x-field"
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          ) : null}
          {error ? (
            <p role="alert" className="mb-3 text-[14px]" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={create.isPending || names.length === 0}
            >
              {create.isPending ? "Starting…" : "Start"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** One thread, with its messages and a composer. */
export function ConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { active } = useSession();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const { data: conversationData, error: loadError } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => api.conversation(id!),
    enabled: Boolean(id),
    retry: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.messages(id!),
    enabled: Boolean(id),
    refetchInterval: 8_000,
    retry: false,
  });

  const messages = data?.messages ?? [];
  const conversation = conversationData?.conversation;

  const send = useMutation({
    mutationFn: (content: string) => api.sendMessage(id!, content),
    onSuccess: () => {
      setDraft("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not send that."),
  });

  // Opening the thread is what marks it read, the way the notifications page
  // behaves — a button nobody would press is not a read receipt.
  useEffect(() => {
    if (!id) return;
    api
      .markConversationRead(id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
      })
      .catch(() => undefined);
  }, [id, messages.length, queryClient]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (loadError) {
    return (
      <div>
        <header className="x-header gap-6">
          <button type="button" onClick={() => navigate("/messages")} className="icon-btn -ml-2" aria-label="Back">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="x-title">Conversation</h1>
        </header>
        <div className="empty-state">
          <h2>Conversation not found</h2>
          <p>It may have been deleted, or you are not in it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="x-header gap-4">
        <button type="button" onClick={() => navigate("/messages")} className="icon-btn -ml-2" aria-label="Back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="x-title truncate">{conversation ? conversationName(conversation) : "…"}</h1>
          {conversation?.isGroup ? (
            <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              {conversation.memberCount} people
            </p>
          ) : null}
        </div>
        {conversation ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              await api.leaveConversation(conversation.id).catch(() => undefined);
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
              navigate("/messages");
            }}
          >
            Leave
          </button>
        ) : null}
      </header>

      <div className="flex-1 px-4 py-3">
        {isLoading ? (
          <PageLoader label="Loading messages…" />
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <h2>No messages yet</h2>
            <p>Say something to start this conversation.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <li key={m.id} className={`flex gap-2 ${m.mine ? "justify-end" : "justify-start"}`}>
                {!m.mine && conversation?.isGroup ? (
                  <Link to={`/${m.sender?.username ?? ""}`} className="self-end shrink-0">
                    <Avatar
                      shape={m.sender?.avatarShape ?? "circle"}
                      size={28}
                      src={m.sender?.avatarUrl || "/assets/default-avatar.svg"}
                    />
                  </Link>
                ) : null}
                <div className="max-w-[75%]">
                  {!m.mine && conversation?.isGroup ? (
                    <span className="block text-[13px] font-bold mb-0.5">
                      <NameWithBadges
                        displayName={m.sender?.displayName ?? "Someone"}
                        verification={m.sender?.effectiveVerification ?? "NONE"}
                        badgeClassName="w-[13px] h-[13px]"
                      />
                    </span>
                  ) : null}
                  <div
                    className="rounded-2xl px-3 py-2 text-[15px] whitespace-pre-wrap break-words"
                    style={
                      m.mine
                        ? { background: "var(--color-primary)", color: "#fff" }
                        : { background: "var(--color-bg-secondary)" }
                    }
                  >
                    {m.deleted ? (
                      <em style={{ opacity: 0.7 }}>Message deleted</em>
                    ) : (
                      m.content
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                      {relativeTime(m.createdAt)}
                    </span>
                    {m.mine && !m.deleted ? (
                      <button
                        type="button"
                        className="text-[12px] hover:underline"
                        style={{ color: "var(--color-text-secondary)" }}
                        onClick={async () => {
                          await api.deleteMessage(m.id).catch(() => undefined);
                          queryClient.invalidateQueries({ queryKey: ["messages", id] });
                        }}
                      >
                        Unsend
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottom} />
      </div>

      <form
        className="sticky bottom-0 flex gap-2 items-end px-4 py-3 border-t"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) send.mutate(draft.trim());
        }}
      >
        <Avatar
          shape={active?.avatarShape ?? "circle"}
          size={32}
          src={active?.avatarUrl || "/assets/default-avatar.svg"}
        />
        <textarea
          className="flex-1 bg-transparent outline-none resize-none text-[15px] py-1.5 max-h-[120px]"
          rows={1}
          placeholder="Start a new message"
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter is a newline, which is what a chat box
            // is expected to do.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim()) send.mutate(draft.trim());
            }
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={send.isPending || !draft.trim()}>
          Send
        </button>
      </form>

      {error ? (
        <p role="alert" className="px-4 pb-3 text-[14px]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Exported for the profile's Message button, which needs the same rules. */
export function useCanMessage(user: ApiUser | undefined) {
  return useQuery({
    queryKey: ["can-message", user?.username],
    queryFn: () => api.canMessage(user!.username),
    enabled: Boolean(user),
    retry: false,
  });
}
