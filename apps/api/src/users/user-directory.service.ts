import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import {
  COMMUNITY_NOTES_ACCOUNT,
  type VerificationType,
  avatarShapeFor,
  canAffiliate,
  checkAffiliation,
  effectiveVerification,
  verificationPresentation,
} from "@horizon/shared";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "./directory-error";

export type AccountStatus = "ACTIVE" | "SUSPENDED";

export interface AffiliationSummary {
  id: string;
  username: string;
  displayName: string;
  verification: VerificationType;
  avatarShape: "circle" | "square";
  badge: string | null;
  avatarUrl: string | null;
}

export interface PresentedUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  /** Tier granted by an administrator, before any affiliation is applied. */
  verification: VerificationType;
  /** Badge the account actually shows, derived from tier + affiliation. */
  effectiveVerification: VerificationType;
  badge: string | null;
  avatarShape: "circle" | "square";
  verificationLabel: string;
  canAffiliate: boolean;
  affiliatedTo: AffiliationSummary | null;
  affiliatedAt: string | null;
  affiliateCount: number;
  status: AccountStatus;
  isSystem: boolean;
  loginDisabled: boolean;
  isAdmin: boolean;
  isProtected: boolean;
  website: string | null;
  location: string | null;
  pronouns: string | null;
  birthday: string | null;
  followingCount: number;
  followersCount: number;
  automatedBy: { username: string; displayName: string } | null;
  automatedPending: boolean;
  createdAt: string;
}

export interface VerificationEvent {
  id: string;
  userId: string;
  fromType: VerificationType;
  toType: VerificationType;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

/** The columns every presentation needs. */
const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  website: true,
  location: true,
  pronouns: true,
  birthday: true,
  isProtected: true,
  automatedById: true,
  automatedPending: true,
  verification: true,
  affiliatedToId: true,
  affiliatedAt: true,
  status: true,
  isSystem: true,
  loginDisabled: true,
  createdAt: true,
} as const;

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  website: string | null;
  location: string | null;
  pronouns: string | null;
  birthday: Date | null;
  isProtected: boolean;
  automatedById: string | null;
  automatedPending: boolean;
  verification: VerificationType;
  affiliatedToId: string | null;
  affiliatedAt: Date | null;
  status: string;
  isSystem: boolean;
  loginDisabled: boolean;
  createdAt: Date;
};

/**
 * Accounts, verification tiers and affiliations, stored in Postgres.
 *
 * The badge an account displays is never written down: it is derived from the
 * granted tier plus any affiliation on every read, which is what makes removing
 * an affiliation restore exactly what the account had earned on its own.
 */
@Injectable()
export class UserDirectoryService implements OnModuleInit {
  private readonly logger = new Logger(UserDirectoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedSystemAccounts().catch((error) => {
      // A cold database on first boot should not stop the API from starting;
      // the seed retries on the next restart.
      this.logger.warn(`Could not seed system accounts yet: ${(error as Error).message}`);
    });
  }

  /**
   * @CommunityNotes is owned by the instance, not by a person: verified as a
   * business so its notes carry the badge, and immutable so no administrator
   * can quietly repurpose or silence it.
   */
  private async seedSystemAccounts() {
    const existing = await this.prisma.user.findFirst({
      where: { username: COMMUNITY_NOTES_ACCOUNT.username },
      select: { id: true, avatarUrl: true },
    });

    if (existing) {
      if (existing.avatarUrl !== COMMUNITY_NOTES_ACCOUNT.avatarUrl) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { avatarUrl: COMMUNITY_NOTES_ACCOUNT.avatarUrl },
        });
      }
      return;
    }

    // No usable credential: the hash is of a value nobody holds, and
    // loginDisabled refuses the account at sign-in regardless.
    const unusablePassword = await argon2.hash(randomBytes(32).toString("hex"), {
      type: argon2.argon2id,
    });

    await this.prisma.user.create({
      data: {
        username: COMMUNITY_NOTES_ACCOUNT.username,
        email: `${COMMUNITY_NOTES_ACCOUNT.username.toLowerCase()}@system.invalid`,
        passwordHash: unusablePassword,
        displayName: COMMUNITY_NOTES_ACCOUNT.displayName,
        bio: COMMUNITY_NOTES_ACCOUNT.bio,
        avatarUrl: COMMUNITY_NOTES_ACCOUNT.avatarUrl,
        verification: "BUSINESS",
        isSystem: true,
        loginDisabled: true,
      },
    });
    this.logger.log(`Seeded system account @${COMMUNITY_NOTES_ACCOUNT.username}`);
  }

  /** System accounts reject every mutation, whoever is asking. */
  private refuseIfSystem(user: { isSystem: boolean; username: string }, action: string) {
    if (!user.isSystem) return;
    throw new DirectoryError(
      "SYSTEM_ACCOUNT_IMMUTABLE",
      `@${user.username} is a system account and cannot be ${action}.`,
      403,
    );
  }

  private async row(username: string): Promise<UserRow> {
    const user = await this.prisma.user.findFirst({
      where: { username },
      select: USER_SELECT,
    });
    if (!user) {
      throw new DirectoryError("USER_NOT_FOUND", `No account @${username} on this instance.`, 404);
    }
    return user as UserRow;
  }

  private summarise(user: UserRow): AffiliationSummary {
    const type = effectiveVerification(user.verification, Boolean(user.affiliatedToId));
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      verification: type,
      avatarShape: avatarShapeFor(type),
      badge: verificationPresentation(type).badge,
      avatarUrl: user.avatarUrl,
    };
  }

  private async present(user: UserRow): Promise<PresentedUser> {
    const type = effectiveVerification(user.verification, Boolean(user.affiliatedToId));
    const presentation = verificationPresentation(type);

    const [parent, affiliateCount, followingCount, followersCount, automatedBy] = await Promise.all([
      user.affiliatedToId
        ? (this.prisma.user.findUnique({
            where: { id: user.affiliatedToId },
            select: USER_SELECT,
          }) as Promise<UserRow | null>)
        : Promise.resolve(null),
      this.prisma.user.count({ where: { affiliatedToId: user.id } }),
      this.prisma.follow.count({ where: { followerId: user.id } }),
      this.prisma.follow.count({ where: { followingId: user.id } }),
      user.automatedById && !user.automatedPending
        ? this.prisma.user.findUnique({
            where: { id: user.automatedById },
            select: { username: true, displayName: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      verification: user.verification,
      effectiveVerification: type,
      badge: presentation.badge,
      // Shape follows the displayed badge: an account raised to business by an
      // affiliation shows square until that affiliation is removed.
      avatarShape: avatarShapeFor(type),
      verificationLabel: presentation.label,
      // System accounts hold an organisation tier but refuse every mutation,
      // so they never offer affiliation either.
      canAffiliate: canAffiliate(type) && !user.isSystem,
      affiliatedTo: parent ? this.summarise(parent) : null,
      affiliatedAt: user.affiliatedAt?.toISOString() ?? null,
      affiliateCount,
      status: user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
      isSystem: user.isSystem,
      loginDisabled: user.loginDisabled,
      isAdmin: await this.userIsAdmin(user.id),
      isProtected: Boolean(user.isProtected),
      website: user.website ?? null,
      location: user.location ?? null,
      pronouns: user.pronouns ?? null,
      birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
      followingCount,
      followersCount,
      automatedBy: automatedBy ?? null,
      automatedPending: Boolean(user.automatedPending),
      createdAt: user.createdAt.toISOString(),
    };
  }

  async list(): Promise<PresentedUser[]> {
    const users = (await this.prisma.user.findMany({
      where: { status: { not: "DELETED" } },
      orderBy: { username: "asc" },
      select: USER_SELECT,
    })) as UserRow[];
    return Promise.all(users.map((u) => this.present(u)));
  }

  /**
   * The administrator's view of the directory: searchable, filterable, paged.
   *
   * Separate from `list()` because that one is public and returns every account
   * in one unbounded response — fine for a seed instance, useless for
   * moderating a real one, and not something to widen with search filters that
   * anonymous callers would also get.
   */
  async search(input: {
    query?: string;
    status?: AccountStatus | "ALL";
    verified?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<{ users: PresentedUser[]; total: number; page: number; perPage: number }> {
    const perPage = Math.min(Math.max(input.perPage ?? 25, 1), 100);
    const page = Math.max(input.page ?? 1, 1);
    const query = (input.query ?? "").trim();

    const where = {
      status:
        input.status && input.status !== "ALL"
          ? input.status
          : ({ not: "DELETED" } as const),
      ...(query
        ? {
            OR: [
              { username: { contains: query, mode: "insensitive" as const } },
              { displayName: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(input.verified === true ? { verification: { not: "NONE" as const } } : {}),
      ...(input.verified === false ? { verification: "NONE" as const } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: USER_SELECT,
      }) as Promise<UserRow[]>,
      this.prisma.user.count({ where }),
    ]);

    return { users: await Promise.all(rows.map((u) => this.present(u))), total, page, perPage };
  }

  async get(username: string): Promise<PresentedUser> {
    return this.present(await this.row(username));
  }

  /** Like get(), but returns null for an unknown handle instead of throwing. */
  async tryGet(username: string): Promise<PresentedUser | null> {
    const user = (await this.prisma.user.findFirst({
      where: { username },
      select: USER_SELECT,
    })) as UserRow | null;
    return user ? this.present(user) : null;
  }

  /** Administrative account creation. Sign-up goes through AuthService. */
  async create(input: {
    username: string;
    displayName: string;
    bio?: string;
    verification?: VerificationType;
  }): Promise<PresentedUser> {
    const clash = await this.prisma.user.findFirst({
      where: { username: input.username },
      select: { id: true },
    });
    if (clash) {
      throw new DirectoryError("USERNAME_TAKEN", `@${input.username} already exists.`, 409);
    }

    const unusablePassword = await argon2.hash(randomBytes(32).toString("hex"), {
      type: argon2.argon2id,
    });

    const user = (await this.prisma.user.create({
      data: {
        username: input.username,
        email: `${input.username.toLowerCase()}@placeholder.invalid`,
        passwordHash: unusablePassword,
        displayName: input.displayName,
        bio: input.bio,
        verification: input.verification ?? "NONE",
      },
      select: USER_SELECT,
    })) as UserRow;

    if (user.verification !== "NONE") {
      await this.record(user.id, "NONE", user.verification, null, "Set at account creation");
    }
    return this.present(user);
  }

  /** Grant or revoke a tier (the verification.grant / .revoke permissions). */
  async setVerification(username: string, type: VerificationType, reason?: string) {
    const user = await this.row(username);
    this.refuseIfSystem(user, "re-verified");

    const from = user.verification;
    await this.prisma.user.update({ where: { id: user.id }, data: { verification: type } });

    // Dropping an organisation tier leaves its affiliates dangling, so release
    // them rather than letting them keep a badge nobody is backing.
    let released = 0;
    if (!canAffiliate(type)) {
      const affiliates = (await this.prisma.user.findMany({
        where: { affiliatedToId: user.id },
        select: USER_SELECT,
      })) as UserRow[];

      for (const other of affiliates) {
        const before = effectiveVerification(other.verification, true);
        const after = effectiveVerification(other.verification, false);
        await this.prisma.user.update({
          where: { id: other.id },
          data: { affiliatedToId: null, affiliatedAt: null },
        });
        released += 1;
        if (before !== after) {
          await this.record(other.id, before, after, user.id, `@${user.username} is no longer an organisation`);
        }
      }
    }

    if (from !== type) await this.record(user.id, from, type, null, reason ?? null);
    return { user: await this.get(username), releasedAffiliates: released };
  }

  /** Organisations above this account, nearest first. */
  private async ancestors(user: UserRow): Promise<string[]> {
    const chain: string[] = [];
    let currentId = user.affiliatedToId;
    while (currentId && !chain.includes(currentId)) {
      chain.push(currentId);
      const parent: { affiliatedToId: string | null } | null = await this.prisma.user.findUnique({
        where: { id: currentId },
        select: { affiliatedToId: true },
      });
      currentId = parent?.affiliatedToId ?? null;
    }
    return chain;
  }

  async affiliate(organisationUsername: string, targetUsername: string) {
    const organisation = await this.row(organisationUsername);
    const target = await this.row(targetUsername);
    this.refuseIfSystem(organisation, "used to affiliate accounts");
    this.refuseIfSystem(target, "affiliated");

    const organisationType = effectiveVerification(
      organisation.verification,
      Boolean(organisation.affiliatedToId),
    );

    const check = checkAffiliation({
      organisationId: organisation.id,
      organisationVerification: organisationType,
      targetId: target.id,
      targetAffiliatedToId: target.affiliatedToId,
      ancestorsOfOrganisation: await this.ancestors(organisation),
    });
    if (!check.allowed) {
      throw new DirectoryError(check.reason ?? "AFFILIATION_REFUSED", check.message ?? "Refused.", 409);
    }

    const before = effectiveVerification(target.verification, false);
    const after = effectiveVerification(target.verification, true);
    await this.prisma.user.update({
      where: { id: target.id },
      data: { affiliatedToId: organisation.id, affiliatedAt: new Date() },
    });

    if (before !== after) {
      await this.record(target.id, before, after, organisation.id, `Affiliated with @${organisation.username}`);
    }

    return {
      user: await this.get(targetUsername),
      organisation: await this.get(organisationUsername),
    };
  }

  async removeAffiliation(targetUsername: string) {
    const target = await this.row(targetUsername);
    this.refuseIfSystem(target, "un-affiliated");
    if (!target.affiliatedToId) {
      throw new DirectoryError("NOT_AFFILIATED", `@${target.username} is not affiliated.`, 409);
    }

    const organisationId = target.affiliatedToId;
    const before = effectiveVerification(target.verification, true);
    const after = effectiveVerification(target.verification, false);

    await this.prisma.user.update({
      where: { id: target.id },
      data: { affiliatedToId: null, affiliatedAt: null },
    });

    if (before !== after) {
      await this.record(target.id, before, after, organisationId, "Affiliation removed");
    }
    return this.get(targetUsername);
  }

  async affiliates(username: string): Promise<PresentedUser[]> {
    const organisation = await this.row(username);
    const rows = (await this.prisma.user.findMany({
      where: { affiliatedToId: organisation.id },
      orderBy: { username: "asc" },
      select: USER_SELECT,
    })) as UserRow[];
    return Promise.all(rows.map((r) => this.present(r)));
  }

  async historyFor(username: string): Promise<VerificationEvent[]> {
    const user = await this.row(username);
    const events = await this.prisma.verificationHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return events.map((e) => ({
      id: e.id,
      userId: e.userId,
      fromType: e.fromType as VerificationType,
      toType: e.toType as VerificationType,
      actorId: e.actorId,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /** Edit a profile. System accounts refuse. */
  async update(
    username: string,
    changes: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string | null;
      bannerUrl?: string | null;
      website?: string | null;
      location?: string | null;
      pronouns?: string | null;
      birthday?: string | null;
      isProtected?: boolean;
    },
  ) {
    const user = await this.row(username);
    this.refuseIfSystem(user, "edited");
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(changes.displayName !== undefined ? { displayName: changes.displayName } : {}),
        ...(changes.bio !== undefined ? { bio: changes.bio } : {}),
        ...(changes.avatarUrl !== undefined ? { avatarUrl: changes.avatarUrl } : {}),
        ...(changes.bannerUrl !== undefined ? { bannerUrl: changes.bannerUrl } : {}),
        ...(changes.website !== undefined ? { website: changes.website } : {}),
        ...(changes.location !== undefined ? { location: changes.location } : {}),
        ...(changes.pronouns !== undefined ? { pronouns: changes.pronouns } : {}),
        ...(changes.birthday !== undefined
          ? { birthday: changes.birthday ? new Date(changes.birthday) : null }
          : {}),
        ...(changes.isProtected !== undefined ? { isProtected: changes.isProtected } : {}),
      },
    });
    return this.get(username);
  }

  /** Suspend or restore an account. System accounts refuse. */
  async setStatus(username: string, status: AccountStatus) {
    const user = await this.row(username);
    this.refuseIfSystem(user, status === "SUSPENDED" ? "suspended" : "restored");
    await this.prisma.user.update({ where: { id: user.id }, data: { status } });
    return this.get(username);
  }


  /** True when the account holds an administrator or owner role. */

  /**
   * This account asks to be marked automated-by @manager.
   * Manager must accept before the robot badge shows.
   */
  async requestAutomation(username: string, managerUsername: string) {
    const user = await this.row(username);
    this.refuseIfSystem(user, "edited");
    if (user.username.toLowerCase() === managerUsername.toLowerCase()) {
      throw new DirectoryError("INVALID", "An account cannot automate itself.", 400);
    }
    const manager = await this.row(managerUsername);
    if (manager.isSystem) {
      throw new DirectoryError("INVALID", "System accounts cannot manage automation.", 400);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { automatedById: manager.id, automatedPending: true },
    });
    try {
      await this.prisma.notification.create({
        data: {
          recipientId: manager.id,
          actorId: user.id,
          type: "SYSTEM",
          data: {
            kind: "AUTOMATION_REQUEST",
            fromUsername: user.username,
          },
        },
      });
    } catch {
      /* non-fatal */
    }
    return this.get(username);
  }

  async resolveAutomation(managerId: string, automatedUsername: string, approve: boolean) {
    const automated = await this.row(automatedUsername);
    if (!automated.automatedById || automated.automatedById !== managerId) {
      throw new DirectoryError("NOT_FOUND", "No pending automation request for you.", 404);
    }
    if (!automated.automatedPending && approve) {
      return this.get(automatedUsername);
    }
    if (approve) {
      await this.prisma.user.update({
        where: { id: automated.id },
        data: { automatedPending: false },
      });
    } else {
      await this.prisma.user.update({
        where: { id: automated.id },
        data: { automatedById: null, automatedPending: false },
      });
    }

    try {
      // The manager's "wants you to manage this account" row has been answered,
      // so it should stop sitting in their list as though it were still open.
      await this.prisma.notification.deleteMany({
        where: {
          recipientId: managerId,
          actorId: automated.id,
          type: "SYSTEM",
        },
      });
      // And the account that asked hears back either way — an unanswered
      // request is indistinguishable from a declined one otherwise.
      await this.prisma.notification.create({
        data: {
          recipientId: automated.id,
          actorId: managerId,
          type: "SYSTEM",
          data: { kind: approve ? "AUTOMATION_ACCEPTED" : "AUTOMATION_DECLINED" },
        },
      });
    } catch {
      /* non-fatal */
    }

    return this.get(automatedUsername);
  }

  private async userIsAdmin(userId: string): Promise<boolean> {
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { name: { in: ["administrator", "owner"] } },
      },
      select: { userId: true },
    });
    return Boolean(row);
  }

  private async record(
    userId: string,
    fromType: VerificationType,
    toType: VerificationType,
    actorId: string | null,
    reason: string | null,
  ) {
    await this.prisma.verificationHistory.create({
      data: { userId, fromType, toType, actorId, reason },
    });
  }
}

export { DirectoryError };
