import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AuthService, SESSION_COOKIE } from "./auth.service";
import { IS_PUBLIC } from "./auth.decorators";
import type { AuthenticatedUser } from "./authenticated-user";

/**
 * Resolves the session cookie onto `req.auth`, and closes every route that has
 * not been marked `@Public()`.
 *
 * Public routes still get `req.auth` when a cookie is present, because reads
 * change shape for the person signed in even when they do not require it.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { auth?: AuthenticatedUser | null }>();
    const session = await this.auth.resolveSession(request.cookies?.[SESSION_COOKIE]);

    request.auth = session
      ? {
          id: session.user.id,
          username: session.user.username,
          displayName: session.user.displayName,
          sessionId: session.sessionId,
          permissions: session.permissions,
        }
      : null;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (!request.auth) {
      throw new UnauthorizedException({
        error: { code: "NOT_SIGNED_IN", message: "Sign in first." },
      });
    }
    return true;
  }
}
