import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { REQUIRED_PERMISSIONS } from "./auth.decorators";
import type { AuthenticatedUser } from "./authenticated-user";

/**
 * Enforces `@RequirePermissions(...)`. Runs after SessionGuard, so `req.auth`
 * is already resolved and a missing session has already been rejected.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { auth?: AuthenticatedUser | null }>();
    const held = request.auth?.permissions;
    const missing = required.filter((permission) => !held?.has(permission));
    if (missing.length === 0) return true;

    throw new ForbiddenException({
      error: {
        code: "FORBIDDEN",
        message: `This action needs the ${missing.join(" and ")} permission${missing.length > 1 ? "s" : ""}.`,
      },
    });
  }
}
