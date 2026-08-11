import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { createReadStream, existsSync } from "fs";
import { mkdir, writeFile, stat } from "fs/promises";
import { extname, join, resolve } from "path";
import { DirectoryError } from "../users/directory-error";
import { PrismaService } from "../database/prisma.service";

/** What a browser may upload as an avatar or banner. GIFs included, animated ones kept. */
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const LIMITS = {
  avatar: 5 * 1024 * 1024,
  banner: 10 * 1024 * 1024,
  post: 10 * 1024 * 1024,
} as const;

export type MediaKind = keyof typeof LIMITS;

/**
 * Uploaded profile media, stored on the local filesystem.
 *
 * The S3 path in @horizon/storage is the eventual home, but it needs
 * credentials an operator has to supply before anything can be uploaded at
 * all. This works on a bare instance with no configuration, and serves the
 * files back through the API — which the site already proxies — so no
 * separate host, bucket or Caddy route is involved.
 *
 * The directory is a volume in docker-compose, so uploads survive a rebuild.
 */
@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly root = resolve(process.env.MEDIA_ROOT ?? join(process.cwd(), "data", "media"));

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await mkdir(this.root, { recursive: true }).catch((error) => {
      this.logger.error(`Could not create the media directory at ${this.root}: ${error}`);
    });
    this.logger.log(`Profile media directory: ${this.root}`);
  }

  async save(
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    kind: MediaKind,
    uploaderId?: string,
  ): Promise<{ url: string; id?: string }> {
    if (!file) {
      throw new DirectoryError("NO_FILE", "No file was uploaded.", 400);
    }

    const extension = ALLOWED.get(file.mimetype);
    if (!extension) {
      throw new DirectoryError(
        "UNSUPPORTED_MEDIA_TYPE",
        "Use a JPEG, PNG, WebP or GIF image.",
        415,
      );
    }

    const limit = LIMITS[kind];
    if (file.size > limit) {
      throw new DirectoryError(
        "FILE_TOO_LARGE",
        `That ${kind} is ${(file.size / 1048576).toFixed(1)} MB; the limit is ${limit / 1048576} MB.`,
        413,
      );
    }

    // The declared type is the client's word for it. Check the magic bytes so a
    // renamed file cannot be stored under an image content type and served back.
    if (!looksLikeImage(file.buffer, file.mimetype)) {
      throw new DirectoryError(
        "NOT_AN_IMAGE",
        "That file is not the image type it claims to be.",
        415,
      );
    }

    const name = `${randomUUID()}${extension}`;
    await writeFile(join(this.root, name), file.buffer);
    const url = `/api/media/${name}`;

    // Avatars and banners are a URL on the account and need no row of their
    // own. A post attachment does: the post references it by id, and the row
    // is what carries alt text and the uploader.
    if (kind !== "post") return { url };

    const media = await this.prisma.media.create({
      data: {
        uploaderId: uploaderId ?? null,
        type: file.mimetype === "image/gif" ? "GIF" : "IMAGE",
        mimeType: file.mimetype,
        sizeBytes: file.size,
        originalKey: name,
        processed: true,
      },
      select: { id: true },
    });
    return { url, id: media.id };
  }

  /** Resolve stored attachments to what a client needs to render them. */
  async describe(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.media.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, originalKey: true, mimeType: true, type: true, altText: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({
        id: r.id,
        url: `/api/media/${r.originalKey}`,
        mimeType: r.mimeType,
        type: r.type as "IMAGE" | "GIF",
        altText: r.altText,
      }));
  }

  /** Every id must exist and belong to the uploader, or the post is refused. */
  async assertOwned(ids: string[], uploaderId: string) {
    if (ids.length === 0) return;
    if (ids.length > 4) {
      throw new DirectoryError("TOO_MANY_ATTACHMENTS", "A post can carry up to four images.", 400);
    }
    const count = await this.prisma.media.count({
      where: { id: { in: ids }, uploaderId, deletedAt: null },
    });
    if (count !== ids.length) {
      throw new DirectoryError("UNKNOWN_ATTACHMENT", "One of those uploads is not yours.", 400);
    }
  }

  /**
   * Resolve a stored file for serving.
   *
   * The name is checked against a strict pattern and the resolved path is
   * confirmed to still be inside the media root, so `..` cannot walk out of it.
   */
  async open(name: string) {
    if (!/^[A-Za-z0-9-]+\.(jpg|png|webp|gif)$/.test(name)) {
      throw new DirectoryError("MEDIA_NOT_FOUND", "No such file.", 404);
    }
    const path = resolve(this.root, name);
    if (!path.startsWith(this.root + "/") || !existsSync(path)) {
      throw new DirectoryError("MEDIA_NOT_FOUND", "No such file.", 404);
    }
    const info = await stat(path);
    const type =
      { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }[
        extname(path)
      ] ?? "application/octet-stream";
    return {
      stream: createReadStream(path),
      type,
      length: info.size,
      etag: createHash("sha1").update(`${name}:${info.size}:${info.mtimeMs}`).digest("hex"),
    };
  }
}

/** Magic-byte check for the four types we accept. */
function looksLikeImage(buffer: Buffer, mimetype: string): boolean {
  if (buffer.length < 12) return false;
  switch (mimetype) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8;
    case "image/png":
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/gif":
      return buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
        buffer.subarray(0, 6).toString("ascii") === "GIF89a";
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}
