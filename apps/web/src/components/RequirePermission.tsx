import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PermissionKey } from "@horizon/shared";
import { useSession } from "../hooks/useSession";

/**
 * Hides an administrative page from accounts the API would refuse.
 *
 * This is presentation only. The same permission is checked again on every
 * request, so this exists to avoid showing someone a settings form they cannot
 * save — not to keep them out.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: PermissionKey;
  children: ReactNode;
}) {
  const { can, isAuthenticated, loading } = useSession();

  if (loading) {
    return (
      <div className="p-8 text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
        Checking your access…
      </div>
    );
  }

  if (can(permission)) return <>{children}</>;

  return (
    <div className="px-6 py-16 max-w-[500px] mx-auto text-center">
      <h1 className="text-[23px] font-extrabold mb-2">
        {isAuthenticated ? "You don’t have access to this page" : "Sign in to continue"}
      </h1>
      <p className="text-[15px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
        {isAuthenticated
          ? `This page needs the ${permission} permission. Ask an administrator of this instance if you think you should have it.`
          : "This page is for administrators of this instance."}
      </p>
      {isAuthenticated ? (
        <Link to="/home" className="btn btn-primary">
          Back to your timeline
        </Link>
      ) : (
        <Link to="/login" className="btn btn-primary">
          Sign in
        </Link>
      )}
    </div>
  );
}
