import { Injectable } from "@nestjs/common";
import { CommunityNotesService, type PresentedNote } from "../notes/community-notes.service";
import { DirectoryError, UserDirectoryService, type PresentedUser } from "../users/user-directory.service";

export interface StoredPost {
  id: string;
  authorUsername: string;
  content: string;
  createdAt: string;
}

export interface PresentedPost extends StoredPost {
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
 * In-memory posts.
 *
 * Enough to render a timeline and a post in full with real author identity;
 * likes, reposts, replies and media are still to come. Written to move to
 * Prisma without changing this surface — the Post model is already in the
 * schema.
 */
@Injectable()
export class PostsService {
  private posts = new Map<string, StoredPost>();
  private seq = 0;

  constructor(
    private readonly directory: UserDirectoryService,
    private readonly notes: CommunityNotesService,
  ) {}

  private present(post: StoredPost): PresentedPost {
    return {
      ...post,
      author: this.directory.tryGet(post.authorUsername),
      notes: this.notes.forPost(post.id),
    };
  }

  private require(id: string): StoredPost {
    const post = this.posts.get(id);
    if (!post) throw new DirectoryError("POST_NOT_FOUND", `No post ${id} on this instance.`, 404);
    return post;
  }

  create(input: { author: string; content: string }): PresentedPost {
    // Reject unknown authors rather than storing a dangling handle.
    this.directory.get(input.author);
    this.seq += 1;
    const post: StoredPost = {
      id: `${Date.now().toString(36)}${this.seq.toString(36)}`,
      authorUsername: input.author,
      content: input.content,
      createdAt: new Date().toISOString(),
    };
    this.posts.set(post.id, post);
    return this.present(post);
  }

  /** Reverse-chronological, optionally limited to one author. */
  list(author?: string): PresentedPost[] {
    return [...this.posts.values()]
      .filter((p) => !author || p.authorUsername.toLowerCase() === author.toLowerCase())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => this.present(p));
  }

  get(id: string): PresentedPost {
    return this.present(this.require(id));
  }

  reset() {
    const removed = this.posts.size;
    this.posts.clear();
    return { removed };
  }
}
