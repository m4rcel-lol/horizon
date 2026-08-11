import {
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { MediaService, type MediaKind } from "./media.service";
import { DirectoryError } from "../users/directory-error";
import { Public } from "../auth/auth.decorators";

/** Avatar and banner uploads, and serving them back. */
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

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

  /**
   * Uploading requires a session — SessionGuard covers this by default. The
   * 12 MB ceiling here is a cheap first cut so an oversized body is dropped
   * before it is buffered; the real per-kind limit is applied in the service.
   */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 12 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    @Query("kind") kind?: string,
  ) {
    const which: MediaKind = kind === "banner" ? "banner" : "avatar";
    return this.unwrap(() => this.media.save(file, which));
  }

  /** Public: avatars appear on public profiles and in public timelines. */
  @Public()
  @Get(":name")
  async serve(@Param("name") name: string, @Res() res: Response) {
    const file = await this.unwrap(() => this.media.open(name));
    res.setHeader("Content-Type", file.type);
    res.setHeader("Content-Length", file.length);
    res.setHeader("ETag", file.etag);
    // The name is a UUID and the content never changes under it, so this can be
    // cached hard. A new upload is a new name.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    file.stream.pipe(res);
  }
}
