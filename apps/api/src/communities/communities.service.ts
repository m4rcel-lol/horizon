import { Injectable } from "@nestjs/common";
import { verificationPresentation, type VerificationType } from "@horizon/shared";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";

export interface PresentedCommunity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  owner: { username: string; displayName: string };
  /** Whether the caller is a member, so the button reads Join or Leave. */
  joinedByViewer: boolean;
}

const COMMUNITY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  avatarUrl: true,
  memberCount: true,
  owner: { select: { username: true, displayName: true } },
} as const;

type CommunityRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  owner: { username: string; displayName: string };
};

/**
 * Communities.
 *
 * Only verified accounts may create one. An unverified instance would fill up
 * with squatted names within a day, and a community carries the weight of a
 * shared space — the verification requirement is the same judgement the
 * affiliation system makes about who can vouch for whom.
 */
@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private present(row: CommunityRow, joined: boolean): PresentedCommunity {
    return { ...row, joinedByViewer: joined };
  }

  private async withMembership(
    rows: CommunityRow[],
    viewerId: string | null,
  ): Promise<PresentedCommunity[]> {
    if (!viewerId || rows.length === 0) return rows.map((r) => this.present(r, false));
    const mine = await this.prisma.communityMember.findMany({
      where: { userId: viewerId, communityId: { in: rows.map((r) => r.id) } },
      select: { communityId: true },
    });
    const joined = new Set(mine.map((m) => m.communityId));
    return rows.map((r) => this.present(r, joined.has(r.id)));
  }

  /** A URL-safe slug from the name, made unique with a suffix if taken. */
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
    throw new DirectoryError("SLUG_TAKEN", "Pick a different name for the community.", 409);
  }

  async create(input: {
    ownerId: string;
    name: string;
    description?: string;
    avatarUrl?: string;
  }): Promise<PresentedCommunity> {
    const owner = await this.prisma.user.findUnique({
      where: { id: input.ownerId },
      select: { id: true, verification: true, affiliatedToId: true, isSystem: true },
    });
    if (!owner) throw new DirectoryError("USER_NOT_FOUND", "No such account.", 404);
    if (owner.isSystem) {
      throw new DirectoryError(
        "SYSTEM_ACCOUNT_IMMUTABLE",
        "System accounts cannot own communities.",
        403,
      );
    }

    // Verified on their own merits, or verified through an affiliation — both
    // mean somebody has vouched for this account.
    const verified =
      owner.verification !== "NONE" || owner.affiliatedToId !== null;
    if (!verified) {
      throw new DirectoryError(
        "VERIFICATION_REQUIRED",
        "Only verified accounts can create a community.",
        403,
      );
    }

    const name = input.name.trim();
    if (name.length < 3) {
      throw new DirectoryError("NAME_TOO_SHORT", "Give the community a name of at least 3 characters.", 400);
    }

    const slug = await this.slugFor(name);
    const community = (await this.prisma.$transaction(async (tx) => {
      const created = await tx.community.create({
        data: {
          ownerId: owner.id,
          name,
          slug,
          description: input.description?.trim() || null,
          avatarUrl: input.avatarUrl || null,
          memberCount: 1,
        },
        select: COMMUNITY_SELECT,
      });
      // The owner is a member: a community with a member count of zero that
      // somebody owns is a contradiction.
      await tx.communityMember.create({ data: { communityId: created.id, userId: owner.id } });
      return created;
    })) as CommunityRow;

    return this.present(community, true);
  }

  async list(viewerId: string | null = null): Promise<PresentedCommunity[]> {
    const rows = (await this.prisma.community.findMany({
      orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
      take: 100,
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

  /** The communities pinned to an account's profile: the ones it belongs to. */
  async forUser(username: string, viewerId: string | null = null): Promise<PresentedCommunity[]> {
    const rows = (await this.prisma.community
      .findMany({
        where: { members: { some: { user: { username } } } },
        orderBy: { memberCount: "desc" },
        take: 10,
        select: COMMUNITY_SELECT,
      })) as CommunityRow[];
    return this.withMembership(rows, viewerId);
  }

  async setMembership(slug: string, userId: string, join: boolean): Promise<PresentedCommunity> {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!community) throw new DirectoryError("COMMUNITY_NOT_FOUND", `No community ${slug}.`, 404);
    if (!join && community.ownerId === userId) {
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
      if (join && !existing) {
        await tx.communityMember.create({ data: { communityId: community.id, userId } });
        await tx.community.update({
          where: { id: community.id },
          data: { memberCount: { increment: 1 } },
        });
      } else if (!join && existing) {
        await tx.communityMember.delete({
          where: { communityId_userId: { communityId: community.id, userId } },
        });
        await tx.community.update({
          where: { id: community.id },
          data: { memberCount: { decrement: 1 } },
        });
      }
    });

    return this.get(slug, userId);
  }

  /** Whether an account may create one, so the button can be hidden rather than refused. */
  canCreate(verification: VerificationType, affiliated: boolean) {
    return verification !== "NONE" || affiliated || verificationPresentation(verification).isOrganisation;
  }
}
