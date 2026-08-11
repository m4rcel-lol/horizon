import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { PermissionKey } from "@horizon/shared";
import type { AuthenticatedUser } from "./authenticated-user";

/**
 * Routes are authenticated by default.
 *
 * That is the point of doing it this way round: a route added later is closed
 * until someone deliberately opens it, rather than open until someone
 * remembers to close it. Reads that anonymous visitors genuinely need — the
 * timeline, a profile, the health probes — say so explicitly.
 */
export const IS_PUBLIC = "horizon:public";
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const REQUIRED_PERMISSIONS = "horizon:permissions";

/** Every listed permission must be held; the guard is an AND, not an OR. */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

/**
 * The caller, as established by SessionGuard.
 *
 * Null only on `@Public()` routes, which may be reached signed out. On every
 * other route the guard has already rejected the request if there is no
 * session, so handlers there can treat it as present.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | null =>
    context.switchToHttp().getRequest().auth ?? null,
);
