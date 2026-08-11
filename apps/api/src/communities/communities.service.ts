import { Injectable, Logger } from "@nestjs/common";
import { verificationPresentation, type VerificationType } from "@horizon/shared";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";

export type CommunityJoinMode = "OPEN" | "REQUEST";

export interface PresentedCommunity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  joinMode: CommunityJoinMode;
  /** Only NONE or INDIVIDUAL for communities. */
  verification: "NONE" | "INDIVIDUAL";
  owner: { username: string; displayName: string };
  joinedByViewer: boolean;
  /** Viewer has a pending join request (REQUEST mode). */
  pendingRequestByViewer: boolean;
}

export interface PresentedJoinRequest {
  id: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  community: { slug: string; name: string };
}

const COMMUNITY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  avatarUrl: true,
  bannerUrl: true,
  memberCount: true,
  joinMode: true,
  verification: true,
  ownerId: true,
  owner: { select: { username: true, displayName: true } },
} as const;

type CommunityRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  joinMode: string;
  verification: string;
  ownerId: string;
  owner: { username: string; displayName: string };
};

@Injectable()
export class CommunitiesService {
  private readonly logger = new Logger(CommunitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private present(
    row: CommunityRow,
    joined: boolean,
    pendingRequest: boolean,
  ): PresentedCommunity {
    const verification: "NONE" | "INDIVIDUAL" =
      row.verification === "INDIVIDUAL" ? "INDIVIDUAL" : "NONE";
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      avatarUrl: row.avatarUrl,
      bannerUrl: row.bannerUrl,
      memberCount: row.memberCount,
      joinMode: row.joinMode === "REQUEST" ? "REQUEST" : "OPEN",
      verification,
      owner: row.owner,
      joinedByViewer: joined,
      pendingRequestByViewer: pendingRequest,
    };
  }

  private async withMembership(
    rows: CommunityRow[],
    viewerId: string | null,
  ): Promise<PresentedCommunity[]> {
    if (!viewerId || rows.length === 0) {
      return rows.map((r) => this.present(r, false, false));
    }
    const [mine, pending] = await Promise.all([
      this.prisma.communityMember.findMany({
        where: { userId: viewerId, communityId: { in: rows.map((r) => r.id) } },
        select: { communityId: true },
      }),
      this.prisma.communityJoinRequest.findMany({
        where: {
          userId: viewerId,
          status: "pending",
          communityId: { in: rows.map((r) => r.id) },
        },
        select: { communityId: true },
      }),
    ]);
    const joined = new Set(mine.map((m) => m.communityId));
    const pendingIds = new Set(pending.map((p) => p.communityId));
    return rows.map((r) => this.present(r, joined.has(r.id), pendingIds.has(r.id)));
  }

  private async slugFor(name: string) {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "community";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const taken = await this.prisma.community.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!taken) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async list(viewerId: string | null = null): Promise<PresentedCommunity[]> {
    const rows = (await this.prisma.community.findMany({
      orderBy: { memberCount: "desc" },
      take: 50,
      select: COMMUNITY_SELECT,
    })) as CommunityRow[];
    return this.withMembership(rows, viewerId);
  }

  async get(slug: string, viewerId: string | null = null): Promise<PresentedCommunity> {
    const row = (await this.prisma.community.findUnique({
      where: { slug },
      select: COMMUNITY_SELECT,
    })) as CommunityRow | null;
    if (!row) throw new DirectoryError("COMMUNITY_NOT_FOUND", `No community ${slug}.`, 404);
    const [presented] = await this.withMembership([row], viewerId);
    return presented;
  }

  async forUser(username: string, viewerId: string | null = null): Promise<PresentedCommunity[]> {
    const rows = (await this.prisma.community.findMany({
      where: { members: { some: { user: { username } } } },
      orderBy: { memberCount: "desc" },
      take: 10,
      select: COMMUNITY_SELECT,
    })) as CommunityRow[];
    return this.withMembership(rows, viewerId);
  }

  async create(input: {
    ownerId: string;
    name: string;
    description?: string;
    avatarUrl?: string;
  }): Promise<PresentedCommunity> {
    const owner = await this.prisma.user.findUnique({
      where: { id: input.ownerId },
      select: { id: true, verification: true, affiliatedToId: true },
    });
    if (!owner) throw new DirectoryError("NOT_FOUND", "Account not found.", 404);
    if (!this.canCreate(owner.verification as VerificationType, Boolean(owner.affiliatedToId))) {
      throw new DirectoryError(
        "FORBIDDEN",
        "Only verified accounts can create a community.",
        403,
      );
    }
    const slug = await this.slugFor(input.name);
    const community = await this.prisma.community.create({
      data: {
        ownerId: input.ownerId,
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        avatarUrl: input.avatarUrl || null,
        joinMode: "OPEN",
        verification: "NONE",
        members: { create: { userId: input.ownerId } },
        memberCount: 1,
      },
      select: COMMUNITY_SELECT,
    });
    return this.present(community as CommunityRow, true, false);
  }

  /**
   * Join or leave. OPEN mode joins immediately. REQUEST mode creates a pending
   * request and notifies the community owner.
   */
  async setMembership(slug: string, userId: string, join: boolean): Promise<PresentedCommunity> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: { id: true, ownerId: true, joinMode: true, name: true, slug: true },
    });
    if (!community) throw new DirectoryError("COMMUNITY_NOT_FOUND", `No community ${slug}.`, 404);

    if (!join) {
      if (community.ownerId === userId) {
        throw new DirectoryError(
          "OWNER_CANNOT_LEAVE",
          "You own this community, so you cannot leave it.",
          400,
        );
      }
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.communityMember.findUnique({
          where: { communityId_userId: { communityId: community.id, userId } },
          select: { userId: true },
        });
        if (existing) {
          await tx.communityMember.delete({
            where: { communityId_userId: { communityId: community.id, userId } },
          });
          await tx.community.update({
            where: { id: community.id },
            data: { memberCount: { decrement: 1 } },
          });
        }
        // Cancel any pending request so the UI is clean.
        await tx.communityJoinRequest.deleteMany({
          where: { communityId: community.id, userId },
        });
      });
      return this.get(slug, userId);
    }

    // Already a member?
    const already = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
      select: { userId: true },
    });
    if (already) return this.get(slug, userId);

    if (community.joinMode === "REQUEST") {
      // Upsert pending request; notify owner once.
      const existing = await this.prisma.communityJoinRequest.findUnique({
        where: { communityId_userId: { communityId: community.id, userId } },
      });
      if (existing?.status === "pending") return this.get(slug, userId);

      const request = await this.prisma.communityJoinRequest.upsert({
        where: { communityId_userId: { communityId: community.id, userId } },
        create: { communityId: community.id, userId, status: "pending" },
        update: { status: "pending", resolvedAt: null, createdAt: new Date() },
      });

      try {
        await this.prisma.notification.create({
          data: {
            recipientId: community.ownerId,
            actorId: userId,
            type: "COMMUNITY",
            communityId: community.id,
            data: {
              kind: "JOIN_REQUEST",
              requestId: request.id,
              communitySlug: community.slug,
              communityName: community.name,
            },
          },
        });
      } catch (error) {
        this.logger.warn(`Could not notify owner of join request: ${error}`);
      }

      return this.get(slug, userId);
    }

    // OPEN: join immediately.
    await this.prisma.$transaction(async (tx) => {
      await tx.communityMember.create({ data: { communityId: community.id, userId } });
      await tx.community.update({
        where: { id: community.id },
        data: { memberCount: { increment: 1 } },
      });
      await tx.communityJoinRequest.deleteMany({
        where: { communityId: community.id, userId },
      });
    });
    return this.get(slug, userId);
  }

  async update(
    slug: string,
    actorId: string,
    changes: {
      avatarUrl?: string | null;
      bannerUrl?: string | null;
      description?: string;
      joinMode?: CommunityJoinMode;
      verification?: "NONE" | "INDIVIDUAL";
    },
  ): Promise<PresentedCommunity> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!community) throw new DirectoryError("COMMUNITY_NOT_FOUND", `No community ${slug}.`, 404);
    if (community.ownerId !== actorId) {
      throw new DirectoryError("FORBIDDEN", "Only the owner can edit this community.", 403);
    }
    if (changes.verification !== undefined && changes.verification !== "NONE" && changes.verification !== "INDIVIDUAL") {
      throw new DirectoryError(
        "INVALID_VERIFICATION",
        "Communities may only use the normal (blue) verification badge, or none.",
        400,
      );
    }
    await this.prisma.community.update({
      where: { id: community.id },
      data: {
        ...(changes.avatarUrl !== undefined ? { avatarUrl: changes.avatarUrl } : {}),
        ...(changes.bannerUrl !== undefined ? { bannerUrl: changes.bannerUrl } : {}),
        ...(changes.description !== undefined ? { description: changes.description } : {}),
        ...(changes.joinMode !== undefined ? { joinMode: changes.joinMode } : {}),
        ...(changes.verification !== undefined ? { verification: changes.verification } : {}),
      },
    });
    return this.get(slug, actorId);
  }

  /** Pending join requests for a community (owner only). */
  async listJoinRequests(slug: string, actorId: string): Promise<PresentedJoinRequest[]> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: { id: true, ownerId: true, slug: true, name: true },
    });
    if (!community) throw new DirectoryError("COMMUNITY_NOT_FOUND", `No community ${slug}.`, 404);
    if (community.ownerId !== actorId) {
      throw new DirectoryError("FORBIDDEN", "Only the owner can review join requests.", 403);
    }
    const rows = await this.prisma.communityJoinRequest.findMany({
      where: { communityId: community.id, status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
      community: { slug: community.slug, name: community.name },
    }));
  }

  /**
   * Approve: add as member, drop request.
   * Decline: delete request so it looks like they never asked.
   */
  async resolveJoinRequest(
    slug: string,
    requestId: string,
    actorId: string,
    approve: boolean,
  ): Promise<{ ok: true }> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!community) throw new DirectoryError("COMMUNITY_NOT_FOUND", `No community ${slug}.`, 404);
    if (community.ownerId !== actorId) {
      throw new DirectoryError("FORBIDDEN", "Only the owner can review join requests.", 403);
    }

    const request = await this.prisma.communityJoinRequest.findFirst({
      where: { id: requestId, communityId: community.id, status: "pending" },
      select: { id: true, userId: true },
    });
    if (!request) {
      throw new DirectoryError("REQUEST_NOT_FOUND", "That join request is no longer pending.", 404);
    }

    if (approve) {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.communityMember.findUnique({
          where: {
            communityId_userId: { communityId: community.id, userId: request.userId },
          },
          select: { userId: true },
        });
        if (!existing) {
          await tx.communityMember.create({
            data: { communityId: community.id, userId: request.userId },
          });
          await tx.community.update({
            where: { id: community.id },
            data: { memberCount: { increment: 1 } },
          });
        }
        await tx.communityJoinRequest.delete({ where: { id: request.id } });
        // Clear related notifications for the owner.
        await tx.notification.deleteMany({
          where: {
            recipientId: actorId,
            type: "COMMUNITY",
            communityId: community.id,
            actorId: request.userId,
          },
        });
      });
    } else {
      // Decline: remove the request entirely so it never happened.
      await this.prisma.$transaction(async (tx) => {
        await tx.communityJoinRequest.delete({ where: { id: request.id } });
        await tx.notification.deleteMany({
          where: {
            recipientId: actorId,
            type: "COMMUNITY",
            communityId: community.id,
            actorId: request.userId,
          },
        });
      });
    }
    return { ok: true };
  }

  async posts(slug: string, _viewerId: string | null = null) {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!community) throw new DirectoryError("COMMUNITY_NOT_FOUND", `No community ${slug}.`, 404);
    const rows = await this.prisma.communityPost.findMany({
      where: { communityId: community.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        post: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { username: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.post.id,
      authorUsername: r.post.author.username,
      content: r.post.content,
      createdAt: r.post.createdAt.toISOString(),
      author: null,
      notes: [],
      media: [],
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      quoteCount: 0,
      likedByViewer: false,
      repostedByViewer: false,
      bookmarkedByViewer: false,
      deletableByViewer: false,
      quoteOf: null,
      replyTo: null,
      poll: null,
    }));
  }

  canCreate(verification: VerificationType, affiliated: boolean) {
    return (
      verification !== "NONE" ||
      affiliated ||
      verificationPresentation(verification).isOrganisation
    );
  }
}
