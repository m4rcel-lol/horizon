import { Body, Controller, Get, HttpException, Param, Post, Query } from "@nestjs/common";
import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, Length } from "class-validator";
import { COMMUNITY_NOTE_CLASSIFICATIONS, type CommunityNoteClassification } from "@horizon/shared";
import { CommunityNotesService } from "./community-notes.service";
import { DirectoryError } from "../users/user-directory.service";

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

  @IsOptional()
  @IsString()
  @Length(1, 20)
  author?: string;
}

class RateNoteDto {
  @IsBoolean()
  helpful!: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  rater?: string;
}

/**
 * Community Notes.
 *
 * Authorization is not enforced yet — there is no auth module. When it lands,
 * writing a note and rating one both require an authenticated contributor, and
 * the rater identity must come from the session rather than the request body.
 */
@Controller("notes")
export class CommunityNotesController {
  constructor(private readonly notes: CommunityNotesService) {}

  private unwrap<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof DirectoryError) {
        throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
      }
      throw error;
    }
  }

  /** All notes, or those for one post. `visible=true` returns only helpful ones. */
  @Get()
  list(@Query("postId") postId?: string, @Query("visible") visible?: string) {
    const notes = visible === "true" && postId ? this.notes.forPost(postId) : this.notes.list(postId);
    return { notes };
  }

  @Post()
  create(@Body() body: CreateNoteDto) {
    return this.unwrap(() => ({ note: this.notes.create(body) }));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.unwrap(() => ({ note: this.notes.get(id) }));
  }

  @Post(":id/ratings")
  rate(@Param("id") id: string, @Body() body: RateNoteDto) {
    return this.unwrap(() => ({
      note: this.notes.rate(id, body.rater ?? "anonymous", body.helpful),
    }));
  }
}
