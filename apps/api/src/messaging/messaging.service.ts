import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";
import { UserDirectoryService, type PresentedUser } from "../users/user-directory.service";
import { NotificationsService } from "../social/notifications.service";
import { SocialService } from "../social/social.service";

/** Who may start a conversation with you. Stored on UserSettings.dmPermission. */
export type DmPermission = "everyone" | "mutuals" | "following" | "none";

const DM_PERMISSIONS: DmPermission[] = ["everyone", "mutuals", "following", "none"];

export function isDmPermission(value: unknown): value is DmPermission {
  return typeof value === "string" && DM_PERMISSIONS.includes(value as DmPermission);
}

export interface PresentedMessage {
  id: string;
  conversationId: string;
  sender: PresentedUser | null;
  senderId: string;
  content: string;
  createdAt: string;
  /** Set when the sender deleted it; the row stays so the thread keeps its shape. */
  deleted: boolean;
  mine: boolean;
}

export interface PresentedConversation {
  id: string;
  isGroup: boolean;
  /** Group title, or null for a one-to-one thread which is named by its members. */
  title: string | null;
  /** Everyone in it except the caller — the people a list row should show. */
  others: PresentedUser[];
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  /** Messages that arrived after the caller last read the thread. */
  unreadCount: number;
  memberCount: number;
}

/**
 * Direct messages.
 *
 * The models existed and nothing used them: the Messages page was an empty
 * state with a button that did nothing, and the privacy setting that governs
 * this was being written to localStorage where no server could read it.
 *
 * Conversations are membership-based rather than addressed: a message belongs
 * to a thread, and a thread has members, so a group is not a special case bolted
 * onto a pair. Permission is checked when a thread is created, because after
 * that, membership is the consent.
 */
@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UserDirectoryService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => SocialService))
    private readonly social: SocialService,
  ) {}

  /** The recipient's setting, defaulted rather than assumed to exist. */
  async dmPermissionFor(userId: string): Promise<DmPermission> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { dmPermission: true },
    });
    return isDmPermission(settings?.dmPermission) ? settings.dmPermission : "mutuals";
  }

  async setDmPermission(userId: string, permission: DmPermission) {
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, dmPermission: permission },
      update: { dmPermission: permission },
    });
    return { dmPermission: permission };
  }

  /**
   * May `senderId` open a conversation with `recipientId`?
   *
   * Returns a reason rather than a boolean so the caller can say which person
   * refused it, which matters when starting a group of five.
   */
  async canMessage(senderId: string, recipientId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (senderId === recipientId) return { ok: true };

    // A block is absolute and comes first: it should not matter what the
    // blocked account's own settings say.
    if (await this.social.isBlockedBy(senderId, recipientId)) {
      return { ok: false, reason: "blocked" };
    }

    const permission = await this.dmPermissionFor(recipientId);
    if (permission === "everyone") return { ok: true };
    if (permission === "none") return { ok: false, reason: "closed" };

    const [recipientFollowsSender, senderFollowsRecipient] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: recipientId, followingId: senderId } },
        select: { followerId: true },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: senderId, followingId: recipientId } },
        select: { followerId: true },
      }),
    ]);

    if (permission === "following") {
      // "People you follow": the recipient has to follow the sender.
      return recipientFollowsSender ? { ok: true } : { ok: false, reason: "not-followed" };
    }
    // mutuals
    return recipientFollowsSender && senderFollowsRecipient
      ? { ok: true }
      : { ok: false, reason: "not-mutual" };
  }

  /**
   * Whether the caller may open a thread with this handle.
   *
   * Takes a handle rather than an id so the controller does not have to reach
   * into the directory itself just to resolve one.
   */
  async canMessageUsername(senderId: string, username: string) {
    const user = await this.directory.tryGet(username);
    if (!user) throw new DirectoryError("USER_NOT_FOUND", `No account @${username}.`, 404);
    if (user.id === senderId) return { allowed: false, reason: "self" as const };
    const result = await this.canMessage(senderId, user.id);
    return result.ok
      ? { allowed: true, reason: null }
      : { allowed: false, reason: result.reason };
  }

  private async requireMembership(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { conversationId: true, lastReadAt: true },
    });
    if (!member) {
      // The same 404 a non-existent thread gets: membership is the only thing
      // that makes a conversation visible, so a distinct error would tell a
      // stranger the thread exists.
      throw new DirectoryError("CONVERSATION_NOT_FOUND", "No such conversation.", 404);
    }
    return member;
  }

  /**
   * Start a conversation, or return the existing one-to-one thread.
   *
   * Reusing the pair's thread is what makes messaging feel continuous — a
   * second "message" from a profile has to land in the conversation already
   * being had, not open an empty duplicate beside it.
   */
  async createConversation(
    creatorId: string,
    usernames: string[],
    title?: string,
  ): Promise<PresentedConversation> {
    const handles = [...new Set(usernames.map((u) => u.trim()).filter(Boolean))];
    if (handles.length === 0) {
      throw new DirectoryError("NO_RECIPIENTS", "Choose at least one person to message.", 400);
    }
    if (handles.length > 24) {
      throw new DirectoryError("TOO_MANY_RECIPIENTS", "A group can hold 25 people.", 400);
    }

    const recipients = await this.prisma.user.findMany({
      where: { username: { in: handles }, status: { not: "DELETED" }, isSystem: false },
      select: { id: true, username: true },
    });
    if (recipients.length !== handles.length) {
      throw new DirectoryError("USER_NOT_FOUND", "One of those accounts does not exist.", 404);
    }

    const others = recipients.filter((r) => r.id !== creatorId);
    if (others.length === 0) {
      throw new DirectoryError("NO_RECIPIENTS", "Choose someone other than yourself.", 400);
    }

    // Every person has to allow it. Reported by handle so the sender knows who
    // to drop rather than being told "someone" refused.
    for (const recipient of others) {
      const allowed = await this.canMessage(creatorId, recipient.id);
      if (!allowed.ok) {
        throw new DirectoryError(
          "DM_NOT_ALLOWED",
          allowed.reason === "blocked"
            ? `@${recipient.username} does not accept messages from you.`
            : allowed.reason === "closed"
              ? `@${recipient.username} has direct messages turned off.`
              : allowed.reason === "not-mutual"
                ? `@${recipient.username} only accepts messages from people they follow back.`
                : `@${recipient.username} only accepts messages from people they follow.`,
          403,
        );
      }
    }

    const isGroup = others.length > 1;

    if (!isGroup) {
      const existing = await this.findDirectConversation(creatorId, others[0].id);
      if (existing) return this.present(existing, creatorId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup,
        title: isGroup ? title?.trim() || null : null,
        members: {
          create: [
            { userId: creatorId, lastReadAt: new Date() },
            ...others.map((o) => ({ userId: o.id })),
          ],
        },
      },
      select: { id: true },
    });

    return this.getConversation(conversation.id, creatorId);
  }

  /**
   * The existing one-to-one thread between two people, if there is one.
   *
   * Matched on membership rather than a pair key: the thread must have exactly
   * these two members, which a `some`-based query would not guarantee — that
   * would also match a group they are both in.
   */
  private async findDirectConversation(a: string, b: string): Promise<string | null> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        isGroup: false,
        AND: [{ members: { some: { userId: a } } }, { members: { some: { userId: b } } }],
      },
      select: { id: true, _count: { select: { members: true } } },
    });
    return rows.find((r) => r._count.members === 2)?.id ?? null;
  }

  /** Threads the caller is in, most recently active first. */
  async list(userId: string): Promise<PresentedConversation[]> {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      orderBy: { conversation: { lastMessageAt: "desc" } },
      take: 100,
      select: { conversationId: true },
    });
    return Promise.all(memberships.map((m) => this.present(m.conversationId, userId)));
  }

  async getConversation(conversationId: string, userId: string): Promise<PresentedConversation> {
    await this.requireMembership(conversationId, userId);
    return this.present(conversationId, userId);
  }

  private async present(conversationId: string, userId: string): Promise<PresentedConversation> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        isGroup: true,
        title: true,
        lastMessageAt: true,
        members: { select: { userId: true, lastReadAt: true, user: { select: { username: true } } } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, deletedAt: true },
        },
      },
    });
    if (!conversation) {
      throw new DirectoryError("CONVERSATION_NOT_FOUND", "No such conversation.", 404);
    }

    const mine = conversation.members.find((m) => m.userId === userId);
    const others = conversation.members.filter((m) => m.userId !== userId);

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        ...(mine?.lastReadAt ? { createdAt: { gt: mine.lastReadAt } } : {}),
      },
    });

    const last = conversation.messages[0];
    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      title: conversation.title,
      others: (
        await Promise.all(others.map((o) => this.directory.tryGet(o.user.username)))
      ).filter((u): u is PresentedUser => u !== null),
      lastMessage: last
        ? {
            content: last.deletedAt ? "Message deleted" : last.content ?? "",
            createdAt: last.createdAt.toISOString(),
            senderId: last.senderId,
          }
        : null,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      unreadCount,
      memberCount: conversation.members.length,
    };
  }

  /** A thread's messages, oldest last so the client renders bottom-up. */
  async messages(conversationId: string, userId: string, limit = 100): Promise<PresentedMessage[]> {
    await this.requireMembership(conversationId, userId);
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        createdAt: true,
        deletedAt: true,
        sender: { select: { username: true } },
      },
    });

    return Promise.all(
      rows.reverse().map(async (row) => ({
        id: row.id,
        conversationId: row.conversationId,
        sender: await this.directory.tryGet(row.sender.username),
        senderId: row.senderId,
        content: row.deletedAt ? "" : row.content ?? "",
        createdAt: row.createdAt.toISOString(),
        deleted: row.deletedAt !== null,
        mine: row.senderId === userId,
      })),
    );
  }

  /**
   * Send into a thread the sender belongs to.
   *
   * Membership is the permission here, deliberately: the who-can-message-me
   * setting governs who may *start* a conversation, and re-checking it on every
   * message would let someone silently fall out of a thread they are part of
   * when the other person changed a setting mid-conversation.
   *
   * A block is still absolute, so it is re-checked — that is the one change
   * that must take effect inside an existing thread.
   */
  async send(conversationId: string, senderId: string, content: string): Promise<PresentedMessage> {
    await this.requireMembership(conversationId, senderId);
    const body = content.trim();
    if (!body) {
      throw new DirectoryError("EMPTY_MESSAGE", "Write something first.", 400);
    }
    if (body.length > 4000) {
      throw new DirectoryError("MESSAGE_TOO_LONG", "A message can be 4000 characters.", 400);
    }

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: senderId } },
      select: { userId: true },
    });

    for (const member of members) {
      if (await this.social.isBlockedBy(senderId, member.userId)) {
        throw new DirectoryError(
          "BLOCKED",
          "Someone in this conversation does not accept messages from you.",
          403,
        );
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId, content: body },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          createdAt: true,
          deletedAt: true,
          sender: { select: { username: true } },
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });
      // Sending is reading: the sender's own message must not come back as
      // unread to them.
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: senderId } },
        data: { lastReadAt: created.createdAt },
      });
      return created;
    });

    await Promise.all(
      members.map((m) =>
        this.notifications.record({ recipientId: m.userId, actorId: senderId, type: "DM" }),
      ),
    );

    return {
      id: message.id,
      conversationId: message.conversationId,
      sender: await this.directory.tryGet(message.sender.username),
      senderId: message.senderId,
      content: message.content ?? "",
      createdAt: message.createdAt.toISOString(),
      deleted: false,
      mine: true,
    };
  }

  /** Opening a thread is what marks it read. */
  async markRead(conversationId: string, userId: string) {
    await this.requireMembership(conversationId, userId);
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { ok: true as const };
  }

  /** Total unread across every thread, for the navigation badge. */
  async unreadCount(userId: string): Promise<number> {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });
    if (memberships.length === 0) return 0;
    const counts = await Promise.all(
      memberships.map((m) =>
        this.prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
          },
        }),
      ),
    );
    return counts.reduce((sum, n) => sum + n, 0);
  }

  /**
   * Leave a thread.
   *
   * The conversation itself stays for whoever is left; an empty one is removed,
   * because a thread with no members is unreachable by anyone and would only
   * accumulate.
   */
  async leave(conversationId: string, userId: string) {
    await this.requireMembership(conversationId, userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.conversationMember.delete({
        where: { conversationId_userId: { conversationId, userId } },
      });
      const remaining = await tx.conversationMember.count({ where: { conversationId } });
      if (remaining === 0) {
        await tx.conversation.delete({ where: { id: conversationId } });
      }
    });
    return { ok: true as const };
  }

  /** Unsend your own message. The row stays so the thread keeps its shape. */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, conversationId: true, deletedAt: true },
    });
    if (!message) throw new DirectoryError("MESSAGE_NOT_FOUND", "No such message.", 404);
    if (message.senderId !== userId) {
      throw new DirectoryError("NOT_YOURS", "You can only delete your own messages.", 403);
    }
    if (!message.deletedAt) {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), content: null },
      });
    }
    return { ok: true as const };
  }
}
