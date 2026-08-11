import { CanActivate, ExecutionContext, HttpException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { PERMISSIONS } from "@horizon/shared";
import { InstanceSettingsService } from "./instance-settings.service";
import type { AuthenticatedUser } from "../auth/authenticated-user";

/**
 * Routes that keep working while the instance is in maintenance.
 *
 * Without these the mode would be a trap: an administrator could not sign in to
 * turn it off, and the client could not learn why it was being refused, so
 * every visitor would see a bare error instead of the message.
 *
 * Matched against the path with the /api prefix already stripped by Nest.
 */
const ALWAYS_OPEN = [
  // Orchestrators and load balancers have no session to present.
  /^\/?health(\/|$)/,
  // Only the routes an administrator needs to get in, plus the two that let a
  // non-administrator be told what is going on and sign themselves out. The
  // rest of /auth — registration and session management — is part of the site
  // and is closed with everything else. Signing in is separately refused for
  // anyone without the permission, so reaching this route is not access.
  /^\/?auth\/login$/,
  /^\/?auth\/switch$/,
  /^\/?auth\/logout$/,
  /^\/?auth\/me$/,
  // The client reads this to know it is in maintenance and what to say.
  /^\/?instance$/,
  // Where the mode gets turned back off.
  /^\/?instance\/settings(\/|$)/,
];

/**
 * Refuses everything with 503 while maintenance mode is on.
 *
 * Runs after SessionGuard, so `req.auth` is already resolved and the exemption
 * can be a permission check rather than a second lookup. Anyone holding
 * system.manage passes straight through, which is what makes the mode usable:
 * an administrator can work on a running instance nobody else can reach.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly settings: InstanceSettingsService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    if (!this.settings.get("maintenance.enabled")) return true;

    const request = context.switchToHttp().getRequest<Request & { auth?: AuthenticatedUser | null }>();
    const path = request.path.replace(/^\/api/, "");
    if (ALWAYS_OPEN.some((pattern) => pattern.test(path))) return true;

    if (request.auth?.permissions?.has(PERMISSIONS.SYSTEM_MANAGE)) return true;

    throw new HttpException(
      {
        error: {
          code: "MAINTENANCE_MODE",
          message:
            (this.settings.get("maintenance.message") as string) ||
            "This instance is down for maintenance.",
        },
      },
      503,
    );
  }
}
