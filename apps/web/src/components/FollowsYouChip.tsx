import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useSession } from "../hooks/useSession";

/**
 * "Follows you", next to the handle.
 *
 * Beside the @name is where it answers the question you are asking while you
 * look at it — do I know this person — rather than under the Follow button,
 * where it reads as a footnote to a control.
 */
export function FollowsYouChip({ username }: { username: string }) {
  const { isAuthenticated } = useSession();
  const { data } = useQuery({
    queryKey: ["relationship", username],
    queryFn: () => api.relationship(username),
    enabled: isAuthenticated && Boolean(username),
    retry: false,
  });

  if (!data?.followsYou || data.isSelf) return null;

  return (
    <span
      className="inline-block align-middle px-1.5 py-0.5 rounded text-[12px] font-medium animate-fade-in"
      style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}
    >
      Follows you
    </span>
  );
}
