import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useSession } from "../hooks/useSession";

/**
 * Follow / Following for one account.
 *
 * Sends the state it wants rather than a toggle, so a double click cannot land
 * on the opposite of what was asked. While following, the button reads
 * "Following" and turns into "Unfollow" on hover — the standard affordance,
 * and the only way to make one button mean both without a second control.
 */
export function FollowButton({ username, className = "" }: { username: string; className?: string }) {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hover, setHover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["relationship", username],
    queryFn: () => api.relationship(username),
    enabled: Boolean(username),
    retry: false,
  });

  const set = useMutation({
    mutationFn: (on: boolean) => api.setFollow(username, on),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationship", username] });
      queryClient.invalidateQueries({ queryKey: ["user", username] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["follow-list"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not update that."),
  });

  // Your own profile has no follow button.
  if (data?.isSelf) return null;

  const following = data?.following ?? false;
  // A private account turns Follow into a request, so the button has a third
  // state: asked, and waiting. Pressing it again withdraws the request, which
  // is the same call as unfollowing.
  const requested = data?.requested ?? false;
  // They blocked us: following is refused server-side, so the control says why
  // instead of offering an action that cannot succeed.
  const blockedBy = data?.blockedBy ?? false;
  const label = following
    ? hover
      ? "Unfollow"
      : "Following"
    : requested
      ? hover
        ? "Withdraw"
        : "Requested"
      : "Follow";

  if (blockedBy) {
    return (
      <span
        className={`btn btn-outline ${className}`}
        style={{ color: "var(--color-text-secondary)", cursor: "default" }}
        title="This account has blocked you"
      >
        Blocked
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        className={`btn ${following || requested ? "btn-outline" : "btn-primary"} ${className}`}
        aria-pressed={following || requested}
        disabled={set.isPending}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => {
          if (!isAuthenticated) {
            navigate("/login");
            return;
          }
          setError(null);
          set.mutate(!(following || requested));
        }}
        style={
          (following || requested) && hover
            ? { color: "var(--color-danger, #f91880)", borderColor: "var(--color-danger, #f91880)" }
            : undefined
        }
      >
        {label}
      </button>
      {error ? (
        <span role="alert" className="mt-1 text-[12px]" style={{ color: "var(--color-danger)" }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
