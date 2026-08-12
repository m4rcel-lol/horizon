import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { RESERVED_USERNAMES } from "@horizon/shared";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";

/** How long a session stays valid without use. Refreshed on every request. */
export const SESSION_IDLE_DAYS = 30;
/** Hard ceiling: a session older than this is refused however active it is. */
export const SESSION_ABSOLUTE_DAYS = 90;
export const SESSION_COOKIE = "horizon_session";

/**
 * What a suspended account is told when it tries to sign in.
 *
 * "This account is suspended." on its own leaves someone with no idea what
 * happened or whether it ever ends — the reason and the end date are the whole
 * difference between a message and a wall.
 */
function describeSuspension(user: {
  suspensionReason: string | null;
  suspendedUntil: Date | null;
}): string {
  const until = user.suspendedUntil
    ? `until ${user.suspendedUntil.toISOString().slice(0, 10)}`
    : "indefinitely";
  const reason = user.suspensionReason ? ` Reason: ${user.suspensionReason}` : "";
  return `This account is suspended ${until}.${reason}`;
}

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sessions are random tokens, not signed claims: only a SHA-256 hash is
   * stored, so a database leak does not hand over live sessions, and revoking
   * one is a single write rather than a token blacklist.
   */
  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private assertUsernameAllowed(username: string) {
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new DirectoryError("USERNAME_RESERVED", `@${username} is reserved on this instance.`, 409);
    }
  }

  async register(input: { username: string; email: string; password: string; displayName?: string }) {
    this.assertUsernameAllowed(input.username);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: input.username }, { email: input.email }],
      },
      select: { username: true, email: true },
    });
    if (existing) {
      // Deliberately vague about which one matched: confirming that an email is
      // registered is an account-enumeration leak.
      throw new DirectoryError(
        "ACCOUNT_EXISTS",
        "That username or email is already registered.",
        409,
      );
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        displayName: input.displayName?.trim() || input.username,
      },
      select: { id: true, username: true, displayName: true },
    });

    this.logger.log(`Registered @${user.username}`);
    return user;
  }

  async verifyCredentials(identifier: string, password: string): Promise<SessionUser> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
      select: {
        id: true,
        username: true,
        displayName: true,
        passwordHash: true,
        loginDisabled: true,
        status: true,
        suspensionReason: true,
        suspendedUntil: true,
      },
    });

    const invalid = new DirectoryError("INVALID_CREDENTIALS", "Wrong username or password.", 401);
    if (!user) {
      // Spend roughly the same time as a real verification so the response
      // time does not reveal whether the account exists.
      await argon2.hash(password, { type: argon2.argon2id }).catch(() => undefined);
      throw invalid;
    }

    const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!ok) throw invalid;

    // System accounts hold no usable credentials, but refuse them explicitly
    // rather than relying on that.
    if (user.loginDisabled) {
      throw new DirectoryError(
        "LOGIN_DISABLED",
        `@${user.username} is an automated account and cannot be signed into.`,
        403,
      );
    }
    if (user.status === "SUSPENDED") {
      // A temporary suspension that has run its course lifts itself here,
      // rather than needing a job to have been alive at the right moment.
      const lifted = await this.liftExpiredSuspension(user.id);
      if (!lifted) {
        throw new DirectoryError("ACCOUNT_SUSPENDED", describeSuspension(user), 403);
      }
    }

    return { id: user.id, username: user.username, displayName: user.displayName };
  }

  /**
   * Does this account hold a permission?
   *
   * Needed before a session exists — the maintenance check at sign-in has to
   * know whether the credentials belong to an administrator, and by then
   * `resolveSession` has nothing to resolve.
   */
  async hasPermission(userId: string, key: string): Promise<boolean> {
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { permissions: { some: { permission: { key } } } },
      },
      select: { userId: true },
    });
    return Boolean(row);
  }

  async createSession(
    userId: string,
    meta: { userAgent?: string; ipAddress?: string; delegatedById?: string },
  ) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_IDLE_DAYS * 86400_000);

    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        // Records who opened it when a delegate did, so a delegated action is
        // attributable to a person rather than only to the account.
        delegatedById: meta.delegatedById ?? null,
        userAgent: meta.userAgent?.slice(0, 500),
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Resolve a cookie to its account, extending the idle window as it goes.
   * Returns null rather than throwing so anonymous browsing stays cheap.
   */
  /**
   * Clear a suspension whose end date has passed.
   *
   * Duplicated from the directory service rather than injected, because auth
   * sits below it: pulling the directory in here would make the two circular
   * for the sake of one updateMany.
   */
  private async liftExpiredSuspension(userId: string): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, status: "SUSPENDED", suspendedUntil: { not: null, lte: new Date() } },
      data: {
        status: "ACTIVE",
        suspensionReason: null,
        suspendedAt: null,
        suspendedById: null,
        suspendedUntil: null,
      },
    });
    return count > 0;
  }

  async resolveSession(token: string | undefined) {
    if (!token) return null;

    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            status: true,
            loginDisabled: true,
            // Roles come along on the same round trip. Authorization runs on
            // every request, so a second query per request would be a real
            // cost for something the join gives away.
            roleAssignments: {
              select: {
                role: { select: { permissions: { select: { permission: { select: { key: true } } } } } },
              },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt) return null;
    if (session.expiresAt.getTime() < Date.now()) return null;
    if (session.createdAt.getTime() + SESSION_ABSOLUTE_DAYS * 86400_000 < Date.now()) return null;
    if (session.user.loginDisabled) return null;
    if (session.user.status === "SUSPENDED") {
      // Same self-lifting rule as sign-in: a session should come back the
      // moment a temporary suspension ends, not at the next restart.
      const lifted = await this.liftExpiredSuspension(session.user.id);
      if (!lifted) return null;
    }

    // Slide the window, but only once a minute — every request would be a
    // write per page view for no extra safety.
    const sinceLastUse = Date.now() - session.lastUsedAt.getTime();
    if (sinceLastUse > 60_000) {
      await this.prisma.userSession
        .update({
          where: { id: session.id },
          data: {
            lastUsedAt: new Date(),
            expiresAt: new Date(Date.now() + SESSION_IDLE_DAYS * 86400_000),
          },
        })
        .catch(() => undefined);
    }

    const permissions = new Set<string>();
    for (const { role } of session.user.roleAssignments) {
      for (const { permission } of role.permissions) permissions.add(permission.key);
    }

    return {
      sessionId: session.id,
      permissions,
      user: {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
      },
    };
  }

  async revokeSession(token: string | undefined) {
    if (!token) return;
    await this.prisma.userSession
      .updateMany({
        where: { tokenHash: this.hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  /** Every device this account is signed in on. */
  async listSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true },
    });
    return sessions;
  }

  async revokeOtherSessions(userId: string, keepSessionId: string) {
    const { count } = await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null, id: { not: keepSessionId } },
      data: { revokedAt: new Date() },
    });
    return count;
  }
}
