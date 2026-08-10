import { Injectable } from "@nestjs/common";
import {
  type VerificationType,
  avatarShapeFor,
  canAffiliate,
  checkAffiliation,
  effectiveVerification,
  verificationPresentation,
} from "@horizon/shared";

export interface DirectoryUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  /** Tier granted by an administrator, before any affiliation is applied. */
  verification: VerificationType;
  affiliatedToId: string | null;
  affiliatedAt: string | null;
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

export interface AffiliationSummary {
  id: string;
  username: string;
  displayName: string;
  verification: VerificationType;
  avatarShape: "circle" | "square";
  badge: string | null;
}

export interface PresentedUser extends Omit<DirectoryUser, "affiliatedToId"> {
  /** Badge the account actually shows, derived from tier + affiliation. */
  effectiveVerification: VerificationType;
  badge: string | null;
  avatarShape: "circle" | "square";
  verificationLabel: string;
  canAffiliate: boolean;
  affiliatedTo: AffiliationSummary | null;
  affiliateCount: number;
}

export class DirectoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * In-memory account directory.
 *
 * Mirrors the User model closely enough to exercise verification and
 * affiliation end to end, and is written to swap to Prisma without changing the
 * public surface — the same approach InstanceSettingsService takes while the
 * persistence layer is unfinished. Nothing here survives a restart.
 */
@Injectable()
export class UserDirectoryService {
  private users = new Map<string, DirectoryUser>();
  private history: VerificationEvent[] = [];
  private seq = 0;

  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}_${Date.now().toString(36)}${this.seq.toString(36)}`;
  }

  private byUsername(username: string): DirectoryUser | undefined {
    const key = username.toLowerCase();
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === key) return user;
    }
    return undefined;
  }

  private require(username: string): DirectoryUser {
    const user = this.byUsername(username);
    if (!user) throw new DirectoryError("USER_NOT_FOUND", `No account @${username} on this instance.`, 404);
    return user;
  }

  /** Organisations above this account, nearest first. */
  private ancestors(user: DirectoryUser): string[] {
    const chain: string[] = [];
    let current = user.affiliatedToId ? this.users.get(user.affiliatedToId) : undefined;
    while (current && !chain.includes(current.id)) {
      chain.push(current.id);
      current = current.affiliatedToId ? this.users.get(current.affiliatedToId) : undefined;
    }
    return chain;
  }

  private summarise(user: DirectoryUser): AffiliationSummary {
    const type = effectiveVerification(user.verification, Boolean(user.affiliatedToId));
    const presentation = verificationPresentation(type);
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      verification: type,
      avatarShape: avatarShapeFor(user.verification),
      badge: presentation.badge,
    };
  }

  present(user: DirectoryUser): PresentedUser {
    const isAffiliated = Boolean(user.affiliatedToId);
    const type = effectiveVerification(user.verification, isAffiliated);
    const presentation = verificationPresentation(type);
    const parent = user.affiliatedToId ? this.users.get(user.affiliatedToId) : undefined;

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      verification: user.verification,
      effectiveVerification: type,
      badge: presentation.badge,
      // Shape reflects what the account is, so an affiliated person keeps a
      // circular avatar even though their badge was raised to business.
      avatarShape: avatarShapeFor(user.verification),
      verificationLabel: presentation.label,
      canAffiliate: canAffiliate(type),
      affiliatedTo: parent ? this.summarise(parent) : null,
      affiliatedAt: user.affiliatedAt,
      createdAt: user.createdAt,
      affiliateCount: [...this.users.values()].filter((u) => u.affiliatedToId === user.id).length,
    };
  }

  list(): PresentedUser[] {
    return [...this.users.values()]
      .sort((a, b) => a.username.localeCompare(b.username))
      .map((u) => this.present(u));
  }

  get(username: string): PresentedUser {
    return this.present(this.require(username));
  }

  create(input: { username: string; displayName: string; bio?: string; verification?: VerificationType }) {
    if (this.byUsername(input.username)) {
      throw new DirectoryError("USERNAME_TAKEN", `@${input.username} already exists.`, 409);
    }
    const user: DirectoryUser = {
      id: this.nextId("usr"),
      username: input.username,
      displayName: input.displayName,
      bio: input.bio,
      verification: input.verification ?? "NONE",
      affiliatedToId: null,
      affiliatedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    if (user.verification !== "NONE") {
      this.record(user.id, "NONE", user.verification, null, "Set at account creation");
    }
    return this.present(user);
  }

  /** Grant or revoke a tier directly (the verification.grant / .revoke permissions). */
  setVerification(username: string, type: VerificationType, reason?: string) {
    const user = this.require(username);
    const from = user.verification;
    user.verification = type;

    // Dropping an organisation tier leaves its affiliates dangling, so release
    // them rather than letting them keep a badge nobody is backing.
    let released = 0;
    if (!canAffiliate(type)) {
      for (const other of this.users.values()) {
        if (other.affiliatedToId === user.id) {
          const before = effectiveVerification(other.verification, true);
          other.affiliatedToId = null;
          other.affiliatedAt = null;
          released += 1;
          const after = effectiveVerification(other.verification, false);
          if (before !== after) {
            this.record(other.id, before, after, user.id, `@${user.username} is no longer an organisation`);
          }
        }
      }
    }

    if (from !== type) this.record(user.id, from, type, null, reason ?? null);
    return { user: this.present(user), releasedAffiliates: released };
  }

  affiliate(organisationUsername: string, targetUsername: string) {
    const organisation = this.require(organisationUsername);
    const target = this.require(targetUsername);

    const organisationType = effectiveVerification(
      organisation.verification,
      Boolean(organisation.affiliatedToId),
    );

    const check = checkAffiliation({
      organisationId: organisation.id,
      organisationVerification: organisationType,
      targetId: target.id,
      targetAffiliatedToId: target.affiliatedToId,
      ancestorsOfOrganisation: this.ancestors(organisation),
    });
    if (!check.allowed) {
      throw new DirectoryError(check.reason ?? "AFFILIATION_REFUSED", check.message ?? "Refused.", 409);
    }

    const before = effectiveVerification(target.verification, false);
    target.affiliatedToId = organisation.id;
    target.affiliatedAt = new Date().toISOString();
    const after = effectiveVerification(target.verification, true);

    if (before !== after) {
      this.record(target.id, before, after, organisation.id, `Affiliated with @${organisation.username}`);
    }

    return { user: this.present(target), organisation: this.present(organisation) };
  }

  removeAffiliation(targetUsername: string) {
    const target = this.require(targetUsername);
    if (!target.affiliatedToId) {
      throw new DirectoryError("NOT_AFFILIATED", `@${target.username} is not affiliated.`, 409);
    }
    const organisationId = target.affiliatedToId;
    const before = effectiveVerification(target.verification, true);
    target.affiliatedToId = null;
    target.affiliatedAt = null;
    const after = effectiveVerification(target.verification, false);

    if (before !== after) {
      this.record(target.id, before, after, organisationId, "Affiliation removed");
    }
    return this.present(target);
  }

  affiliates(username: string): PresentedUser[] {
    const organisation = this.require(username);
    return [...this.users.values()]
      .filter((u) => u.affiliatedToId === organisation.id)
      .sort((a, b) => a.username.localeCompare(b.username))
      .map((u) => this.present(u));
  }

  historyFor(username: string): VerificationEvent[] {
    const user = this.require(username);
    return this.history.filter((e) => e.userId === user.id).reverse();
  }

  /** Wipe the directory — used by tests and by operators clearing demo data. */
  reset() {
    const removed = this.users.size;
    this.users.clear();
    this.history = [];
    return { removed };
  }

  private record(
    userId: string,
    fromType: VerificationType,
    toType: VerificationType,
    actorId: string | null,
    reason: string | null,
  ) {
    this.history.push({
      id: this.nextId("vh"),
      userId,
      fromType,
      toType,
      actorId,
      reason,
      createdAt: new Date().toISOString(),
    });
  }
}
