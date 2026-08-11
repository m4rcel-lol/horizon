import { Injectable } from "@nestjs/common";
import { CommunityNotesService, type PresentedNote } from "../notes/community-notes.service";
import { PrismaService } from "../database/prisma.service";
import { DirectoryError } from "../users/directory-error";
import { UserDirectoryService, type PresentedUser } from "../users/user-directory.service";

export interface PresentedPost {
  id: string;
  authorUsername: string;
  content: string;
  createdAt: string;
  /**
   * The author's full public identity, resolved at read time so a timeline
   * renders badges, affiliation and avatar shape without a second request per
   * post — and so a verification change is reflected everywhere at once.
   */
  author: PresentedUser | null;
  /** Notes readers rated helpful. Others never reach the post. */
  notes: PresentedNote[];
}

/**
 * Posts, stored in Postgres.
 *
 * Likes, reposts, replies and media are still to come; this covers writing a
 * post and reading a timeline with real author identity attached.
 */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: UserDirectoryService,
    private readonly notes: CommunityNotesService,
  ) {}

  private async present(post: {
    id: string;
    content: string;
    createdAt: Date;
    author: { username: string };
  }): Promise<PresentedPost> {
    const [author, notes] = await Promise.all([
      this.directory.tryGet(post.author.username),
      this.notes.forPost(post.id),
    ]);
    return {
      id: post.id,
      authorUsername: post.author.username,
      content: post.content,
      createdAt: post.createdAt.toISOString(),
      author,
      notes,
    };
  }

  async create(input: { author: string; content: string }): Promise<PresentedPost> {
    // Reject unknown authors rather than storing a dangling handle.
    const author = await this.directory.get(input.author);

    const post = await this.prisma.post.create({
      data: { authorId: author.id, content: input.content },
      select: { id: true, content: true, createdAt: true, author: { select: { username: true } } },
    });
    return this.present(post);
  }

  /** Reverse-chronological, optionally limited to one author. */
  async list(author?: string): Promise<PresentedPost[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        ...(author ? { author: { username: author } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, content: true, createdAt: true, author: { select: { username: true } } },
    });
    return Promise.all(posts.map((p) => this.present(p)));
  }

  async get(id: string): Promise<PresentedPost> {
    const post = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, content: true, createdAt: true, author: { select: { username: true } } },
    });
    if (!post) throw new DirectoryError("POST_NOT_FOUND", `No post ${id} on this instance.`, 404);
    return this.present(post);
  }
}
