import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LikeIcon,
  RepostIcon,
  ReplyIcon,
  QuoteIcon,
  ProfileIcon,
  CommunitiesIcon,
  MessagesIcon,
  NoteIcon,
  NotificationsIcon,
  RobotIcon,
  LockIcon,
} from "../icons";
import { api, type ApiNotification } from "../api";
import { Avatar, NameWithBadges } from "../components/Verification";
import { useSession } from "../hooks/useSession";
import { PageLoader } from "../components/LoadingSpinner";

const filters = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions" },
] as const;

/**
 * Icon and wording per notification, so a row reads as a sentence.
 *
 * The switch is exhaustive over ApiNotificationType, and the default arm
 * assigns `n.type` to `never`: adding a type on the server without a case here
 * fails the build. That check is the point of this function — a missing case
 * used to fall through to "did something", which is what every unhandled
 * notification silently rendered as.
 */
function describe(n: ApiNotification): { Icon: typeof LikeIcon; colour: string; text: ReactNode } {
  const community = n.community?.name;

  switch (n.type) {
    case "LIKE":
      return { Icon: LikeIcon, colour: "var(--color-danger, #f91880)", text: "liked your post" };
    case "REPOST":
      return { Icon: RepostIcon, colour: "var(--color-success, #00ba7c)", text: "reposted your post" };
    case "REPLY":
      return { Icon: ReplyIcon, colour: "var(--color-primary)", text: "replied to your post" };
    case "QUOTE":
      return { Icon: QuoteIcon, colour: "var(--color-primary)", text: "quoted your post" };
    case "MENTION":
      return { Icon: QuoteIcon, colour: "var(--color-primary)", text: "mentioned you" };
    case "FOLLOW":
      if (n.kind === "FOLLOW_APPROVED") {
        return {
          Icon: ProfileIcon,
          colour: "var(--color-success, #00ba7c)",
          text: "accepted your follow request",
        };
      }
      return { Icon: ProfileIcon, colour: "var(--color-primary)", text: "followed you" };
    case "FOLLOW_REQUEST":
      return { Icon: LockIcon, colour: "var(--color-primary)", text: "asked to follow you" };
    case "DM":
      return { Icon: MessagesIcon, colour: "var(--color-primary)", text: "sent you a message" };
    case "COMMUNITY":
      if (n.kind === "JOIN_APPROVED") {
        return {
          Icon: CommunitiesIcon,
          colour: "var(--color-success, #00ba7c)",
          text: community ? <>accepted your request to join {community}</> : "accepted your request to join",
        };
      }
      return {
        Icon: CommunitiesIcon,
        colour: "var(--color-primary)",
        text: community ? <>asked to join {community}</> : "asked to join your community",
      };
    case "MODERATION":
      return { Icon: NoteIcon, colour: "var(--color-primary)", text: "sent a moderation update" };
    case "SYSTEM":
      switch (n.kind) {
        case "AUTOMATION_REQUEST":
          return {
            Icon: RobotIcon,
            colour: "var(--color-primary)",
            text: "asked you to manage their automated account",
          };
        case "AUTOMATION_ACCEPTED":
          return {
            Icon: RobotIcon,
            colour: "var(--color-success, #00ba7c)",
            text: "now manages this automated account",
          };
        case "AUTOMATION_DECLINED":
          return {
            Icon: RobotIcon,
            colour: "var(--color-text-secondary)",
            text: "declined managing this account",
          };
        default:
          return { Icon: NotificationsIcon, colour: "var(--color-primary)", text: "sent you an update" };
      }
    default: {
      // Exhaustiveness: this line stops compiling the moment a type is added
      // to ApiNotificationType without an arm above.
      const unhandled: never = n.type;
      void unhandled;
      return { Icon: NotificationsIcon, colour: "var(--color-primary)", text: "sent you an update" };
    }
  }
}

function relativeTime(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsPage() {
  const { isAuthenticated } = useSession();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => api.notifications(filter === "mentions" ? "mentions" : undefined),
    enabled: isAuthenticated,
  });

  const markRead = useMutation({
    mutationFn: api.markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  // Opening the page is what "seen" means, so the badge clears on arrival
  // rather than needing a button nobody would press.
  useEffect(() => {
    if (isAuthenticated && !markRead.isPending) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const notifications = data?.notifications ?? [];

  return (
    <div>
      <header className="x-header justify-between">
        <h1 className="x-title">Notifications</h1>
      </header>

      <div className="x-tabs sticky top-[53px] z-10" role="tablist" aria-label="Notification filters">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className="x-tab"
          >
            {f.label}
          </button>
        ))}
      </div>

      {!isAuthenticated ? (
        <div className="empty-state">
          <h2>Sign in to see your notifications</h2>
          <p className="mb-6">Likes, reposts, replies, mentions and follows land here.</p>
          <Link to="/login" className="btn btn-primary btn-lg">
            Sign in
          </Link>
        </div>
      ) : isLoading ? (
        <PageLoader label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing to see here — yet</h2>
          <p>Likes, reposts, replies, mentions and follows land here.</p>
        </div>
      ) : (
        <ul>
          {notifications.map((n) => {
            const { Icon, colour, text } = describe(n);
            const handle = n.actor?.username;
            // The server sends the destination whenever the row has one that
            // is not simply the actor's profile — including post permalinks,
            // which it can build correctly because it knows the post's author.
            const to = n.href || (handle ? `/${handle}` : "/notifications");
            return (
              <li key={n.id}>
                <Link
                  to={to}
                  className="flex gap-3 px-4 py-3 border-b transition-colors hover:bg-[var(--color-row-hover)]"
                  style={{
                    borderColor: "var(--color-border)",
                    // Unread rows are tinted rather than badged, so the whole
                    // list shows at a glance what arrived since you last looked.
                    background: n.read ? undefined : "var(--color-bg-secondary)",
                  }}
                >
                  <span className="shrink-0 pt-0.5" style={{ color: colour }}>
                    <Icon className="w-[22px] h-[22px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {n.actor ? (
                        <Avatar
                          shape={n.actor.avatarShape}
                          size={28}
                          src={n.actor.avatarUrl || "/assets/default-avatar.svg"}
                        />
                      ) : null}
                      <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                    <span className="block mt-1 text-[15px]">
                      <span className="font-bold">
                        {n.actor ? (
                          // No nameHref here: the whole row is already a link
                          // to the thing that happened, and the affiliate mark
                          // renders as a plain image inside it.
                          <NameWithBadges
                            displayName={n.actor.displayName}
                            verification={n.actor.effectiveVerification}
                            badgeClassName="w-[15px] h-[15px]"
                          />
                        ) : (
                          "Someone"
                        )}
                      </span>{" "}
                      {text}
                    </span>
                    {n.excerpt ? (
                      <span
                        className="block mt-1 text-[15px] line-clamp-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {n.excerpt}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
