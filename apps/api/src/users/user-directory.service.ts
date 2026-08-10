import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  COMMUNITY_NOTES_ACCOUNT,
  type VerificationType,
  avatarShapeFor,
  canAffiliate,
  checkAffiliation,
  effectiveVerification,
  verificationPresentation,
} from "@horizon/shared";

export type AccountStatus = "ACTIVE" | "SUSPENDED";

export interface DirectoryUser {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  /** Tier granted by an administrator, before any affiliation is applied. */
  verification: VerificationType;
  affiliatedToId: string | null;
  affiliatedAt: string | null;
  status: AccountStatus;
  /** Seeded by the instance: immutable and impossible to sign into. */
  isSystem: boolean;
  loginDisabled: boolean;
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
  status: AccountStatus;
  isSystem: boolean;
  loginDisabled: boolean;
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
export class UserDirectoryService implements OnModuleInit {
  private users = new Map<string, DirectoryUser>();
  private history: VerificationEvent[] = [];
  private seq = 0;

  onModuleInit() {
    this.seedSystemAccounts();
  }

  /**
   * @CommunityNotes is owned by the instance, not by a person: verified as a
   * business so its notes carry the badge, and immutable so no administrator
   * can quietly repurpose or silence it.
   */
  private seedSystemAccounts() {
    if (this.byUsername(COMMUNITY_NOTES_ACCOUNT.username)) return;
    const user: DirectoryUser = {
      id: "usr_system_communitynotes",
      username: COMMUNITY_NOTES_ACCOUNT.username,
      displayName: COMMUNITY_NOTES_ACCOUNT.displayName,
      bio: COMMUNITY_NOTES_ACCOUNT.bio,
      verification: "BUSINESS",
      affiliatedToId: null,
      affiliatedAt: null,
      status: "ACTIVE",
      isSystem: true,
      loginDisabled: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
  }

  /** System accounts reject every mutation, whoever is asking. */
  private refuseIfSystem(user: DirectoryUser, action: string) {
    if (!user.isSystem) return;
    throw new DirectoryError(
      "SYSTEM_ACCOUNT_IMMUTABLE",
      `@${user.username} is a system account and cannot be ${action}.`,
      403,
    );
  }

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
      avatarShape: avatarShapeFor(type),
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
      // Shape follows the displayed badge: an account raised to business by an
      // affiliation shows square until that affiliation is removed.
      avatarShape: avatarShapeFor(type),
      verificationLabel: presentation.label,
      // System accounts hold an organisation tier but refuse every mutation,
      // so they never offer affiliation either.
      canAffiliate: canAffiliate(type) && !user.isSystem,
      affiliatedTo: parent ? this.summarise(parent) : null,
      affiliatedAt: user.affiliatedAt,
      createdAt: user.createdAt,
      status: user.status,
      isSystem: user.isSystem,
      loginDisabled: user.loginDisabled,
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

  /** Like get(), but returns undefined for an unknown handle instead of throwing. */
  tryGet(username: string): PresentedUser | null {
    const user = this.byUsername(username);
    return user ? this.present(user) : null;
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
      status: "ACTIVE",
      isSystem: false,
      loginDisabled: false,
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
    this.refuseIfSystem(user, "re-verified");
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
    this.refuseIfSystem(target, "un-affiliated");
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
    const removed = [...this.users.values()].filter((u) => !u.isSystem).length;
    this.users.clear();
    this.history = [];
    this.seedSystemAccounts();
    return { removed };
  }

  /** Edit an ordinary profile. System accounts refuse. */
  update(username: string, changes: { displayName?: string; bio?: string }) {
    const user = this.require(username);
    this.refuseIfSystem(user, "edited");
    if (changes.displayName !== undefined) user.displayName = changes.displayName;
    if (changes.bio !== undefined) user.bio = changes.bio;
    return this.present(user);
  }

  /** Suspend or restore an account. System accounts refuse. */
  setStatus(username: string, status: AccountStatus) {
    const user = this.require(username);
    this.refuseIfSystem(user, status === "SUSPENDED" ? "suspended" : "restored");
    user.status = status;
    return this.present(user);
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
