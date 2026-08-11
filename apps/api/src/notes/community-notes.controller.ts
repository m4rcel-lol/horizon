import { Body, Controller, Get, HttpException, Param, Post, Query } from "@nestjs/common";
import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, Length } from "class-validator";
import { COMMUNITY_NOTE_CLASSIFICATIONS, type CommunityNoteClassification } from "@horizon/shared";
import { CommunityNotesService } from "./community-notes.service";
import { DirectoryError } from "../users/user-directory.service";
import { CurrentUser, Public } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/authenticated-user";

class CreateNoteDto {
  @IsString()
  @Length(1, 64)
  postId!: string;

  @IsString()
  @Length(10, 600)
  body!: string;

  @IsOptional()
  @IsIn(COMMUNITY_NOTE_CLASSIFICATIONS)
  classification?: CommunityNoteClassification;

  @IsOptional()
  @IsUrl({ require_tld: false })
  sourceUrl?: string;
}

class RateNoteDto {
  @IsBoolean()
  helpful!: boolean;
}

/**
 * Community Notes.
 *
 * Reading is open; writing a note and rating one need a session, and both
 * identities come from it. The rater in particular used to come from the
 * request body, so a single reader could clear the helpfulness threshold on
 * their own by sending a fresh name each time.
 */
@Controller("notes")
export class CommunityNotesController {
  constructor(private readonly notes: CommunityNotesService) {}

  private async unwrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DirectoryError) {
        throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
      }
      throw error;
    }
  }

  /** All notes, or those for one post. `visible=true` returns only helpful ones. */
  @Public()
  @Get()
  async list(
    @CurrentUser() auth: AuthenticatedUser | null,
    @Query("postId") postId?: string,
    @Query("visible") visible?: string,
  ) {
    const viewer = auth?.id ?? null;
    const notes =
      visible === "true" && postId
        ? await this.notes.forPost(postId, viewer)
        : await this.notes.list(postId, viewer);
    return { notes };
  }

  @Post()
  async create(@Body() body: CreateNoteDto, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({
      note: await this.notes.create({ ...body, authorId: auth.id }),
    }));
  }

  @Public()
  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser | null) {
    return this.unwrap(async () => ({ note: await this.notes.get(id, auth?.id ?? null) }));
  }

  /** One account, one rating: rating again replaces the previous one. */
  @Post(":id/ratings")
  async rate(
    @Param("id") id: string,
    @Body() body: RateNoteDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(async () => ({ note: await this.notes.rate(id, auth.id, body.helpful) }));
  }
}
