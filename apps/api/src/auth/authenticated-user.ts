import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { PermissionKey } from "@horizon/shared";

/** The caller behind a request, resolved from the session cookie. */
export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  sessionId: string;
  /** Flattened from every role the account holds. */
  permissions: ReadonlySet<string>;
}

export function has(auth: AuthenticatedUser | null, permission: PermissionKey): boolean {
  return auth?.permissions.has(permission) ?? false;
}

export function assertSignedIn(auth: AuthenticatedUser | null): AuthenticatedUser {
  if (!auth) {
    throw new UnauthorizedException({
      error: { code: "NOT_SIGNED_IN", message: "Sign in first." },
    });
  }
  return auth;
}

export function assertPermission(auth: AuthenticatedUser | null, permission: PermissionKey) {
  const user = assertSignedIn(auth);
  if (!user.permissions.has(permission)) {
    throw new ForbiddenException({
      error: {
        code: "FORBIDDEN",
        message: `This action needs the ${permission} permission.`,
      },
    });
  }
}

/**
 * Allow the account itself, or an administrator holding `permission`.
 *
 * Used where a route is both a self-service action and a moderation action —
 * editing a profile, leaving an affiliation — so the same endpoint serves the
 * owner and the admin without opening it to everyone else.
 */
export function assertSelfOrPermission(
  auth: AuthenticatedUser | null,
  username: string,
  permission: PermissionKey,
) {
  const user = assertSignedIn(auth);
  if (user.username.toLowerCase() === username.toLowerCase()) return;
  assertPermission(user, permission);
}
