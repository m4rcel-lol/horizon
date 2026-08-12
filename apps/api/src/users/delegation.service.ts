import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "./directory-error";
import { UserDirectoryService, type PresentedUser } from "./user-directory.service";

export interface PresentedDelegation {
  id: string;
  status: "pending" | "accepted";
  /** The account being acted for. */
  owner: PresentedUser | null;
  /** The account allowed to act for it. */
  delegate: PresentedUser | null;
  createdAt: string;
  acceptedAt: string | null;
}

/**
 * Account delegation.
 *
 * Letting someone post for an account without giving them its password. The
 * alternative people actually resort to — sharing the password — cannot be
 * revoked without changing it, cannot be limited to one person, and leaves no
 * way to tell afterwards who did what. A delegation row can be withdrawn from
 * either side at any moment, and it is the row, not a credential, that grants
 * the access.
 *
 * A delegate switches into the account through the ordinary session mechanism:
 * they hold their own session throughout and never learn anything secret about
 * the account they are acting for.
 */
@Injectable()
export class DelegationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UserDirectoryService,
  ) {}

  /**
   * Written straight to the table rather than through NotificationsService.
   *
   * SocialModule already imports UsersModule, so injecting it here would make
   * the two modules circular for the sake of one insert — and a failed
   * notification must not roll back the delegation it is about.
   */
  private async notify(recipientId: string, actorId: string, kind: string) {
    try {
      await this.prisma.notification.create({
        data: { recipientId, actorId, type: "SYSTEM", data: { kind } },
      });
    } catch {
      /* non-fatal */
    }
  }

  private async requireUser(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, status: { not: "DELETED" } },
      select: { id: true, username: true, isSystem: true },
    });
    if (!user) {
      throw new DirectoryError("USER_NOT_FOUND", `No account @${username} on this instance.`, 404);
    }
    return user;
  }

  private async present(row: {
    id: string;
    status: string;
    createdAt: Date;
    acceptedAt: Date | null;
    owner: { username: string };
    delegate: { username: string };
  }): Promise<PresentedDelegation> {
    const [owner, delegate] = await Promise.all([
      this.directory.tryGet(row.owner.username),
      this.directory.tryGet(row.delegate.username),
    ]);
    return {
      id: row.id,
      status: row.status === "accepted" ? "accepted" : "pending",
      owner,
      delegate,
      createdAt: row.createdAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
    };
  }

  private readonly include = {
    owner: { select: { username: true } },
    delegate: { select: { username: true } },
  } as const;

  /** Invite someone to act for your account. */
  async invite(ownerId: string, delegateUsername: string): Promise<PresentedDelegation> {
    const delegate = await this.requireUser(delegateUsername);
    if (delegate.id === ownerId) {
      throw new DirectoryError("INVALID", "You already control your own account.", 400);
    }
    if (delegate.isSystem) {
      throw new DirectoryError("INVALID", "System accounts cannot be delegates.", 400);
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { isSystem: true },
    });
    if (owner?.isSystem) {
      throw new DirectoryError("INVALID", "System accounts cannot be delegated.", 400);
    }

    // Delegation is a trust relationship, and a block is a statement that no
    // such relationship exists. Checked both ways.
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: ownerId, blockedId: delegate.id },
          { blockerId: delegate.id, blockedId: ownerId },
        ],
      },
      select: { blockerId: true },
    });
    if (block) {
      throw new DirectoryError("BLOCKED", "You cannot delegate to that account.", 403);
    }

    const existing = await this.prisma.accountDelegation.findUnique({
      where: { ownerId_delegateId: { ownerId, delegateId: delegate.id } },
      select: { id: true, status: true },
    });
    if (existing) {
      throw new DirectoryError(
        existing.status === "accepted" ? "ALREADY_DELEGATE" : "ALREADY_INVITED",
        existing.status === "accepted"
          ? `@${delegate.username} already manages this account.`
          : `@${delegate.username} has already been invited.`,
        409,
      );
    }

    const row = await this.prisma.accountDelegation.create({
      data: { ownerId, delegateId: delegate.id, status: "pending" },
      include: this.include,
    });

    await this.notify(delegate.id, ownerId, "DELEGATION_REQUEST");

    return this.present(row);
  }

  /** The delegate answers. Declining removes the row, so it reads as never asked. */
  async respond(delegateId: string, ownerUsername: string, accept: boolean) {
    const owner = await this.requireUser(ownerUsername);
    const row = await this.prisma.accountDelegation.findUnique({
      where: { ownerId_delegateId: { ownerId: owner.id, delegateId } },
      select: { id: true, status: true },
    });
    if (!row || row.status !== "pending") {
      throw new DirectoryError("NOT_FOUND", "No pending invitation from that account.", 404);
    }

    if (accept) {
      await this.prisma.accountDelegation.update({
        where: { id: row.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });
    } else {
      await this.prisma.accountDelegation.delete({ where: { id: row.id } });
    }

    await this.notify(
      owner.id,
      delegateId,
      accept ? "DELEGATION_ACCEPTED" : "DELEGATION_DECLINED",
    );

    return { ok: true as const, accepted: accept };
  }

  /**
   * Remove a delegation.
   *
   * Either side may: the owner takes access back, and the delegate resigns.
   * Requiring the owner's cooperation to stop acting for someone would make
   * this a trap rather than a favour.
   */
  async revoke(actorId: string, ownerUsername: string, delegateUsername: string) {
    const [owner, delegate] = await Promise.all([
      this.requireUser(ownerUsername),
      this.requireUser(delegateUsername),
    ]);
    if (actorId !== owner.id && actorId !== delegate.id) {
      throw new DirectoryError("FORBIDDEN", "That delegation is not yours to remove.", 403);
    }
    const { count } = await this.prisma.accountDelegation.deleteMany({
      where: { ownerId: owner.id, delegateId: delegate.id },
    });
    if (count === 0) {
      throw new DirectoryError("NOT_FOUND", "No such delegation.", 404);
    }
    return { ok: true as const };
  }

  /** People who may act for this account, and invitations still open. */
  async forOwner(ownerId: string): Promise<PresentedDelegation[]> {
    const rows = await this.prisma.accountDelegation.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      include: this.include,
    });
    return Promise.all(rows.map((r) => this.present(r)));
  }

  /** Accounts this user may act for, plus invitations waiting on them. */
  async forDelegate(delegateId: string): Promise<PresentedDelegation[]> {
    const rows = await this.prisma.accountDelegation.findMany({
      where: { delegateId },
      orderBy: { createdAt: "desc" },
      include: this.include,
    });
    return Promise.all(rows.map((r) => this.present(r)));
  }

  /** Is this delegation live? The check every act-as request comes through. */
  async isDelegate(delegateId: string, ownerId: string): Promise<boolean> {
    const row = await this.prisma.accountDelegation.findUnique({
      where: { ownerId_delegateId: { ownerId, delegateId } },
      select: { status: true },
    });
    return row?.status === "accepted";
  }
}
