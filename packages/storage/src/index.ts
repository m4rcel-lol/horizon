/**
 * Object storage abstraction (S3-compatible: MinIO, R2, AWS S3, …).
 *
 * Configuration is resolved from environment variables and/or
 * admin panel instance settings (see @horizon/config resolveStorageConfig).
 *
 * Env wins when set; otherwise instance settings are used so operators
 * can configure storage entirely from the admin UI after install.
 */

import type { StorageConfig } from "@horizon/config";

export type { StorageConfig };

export class StorageNotConfiguredError extends Error {
  constructor(message = "Object storage is not configured") {
    super(message);
    this.name = "StorageNotConfiguredError";
  }
}

/**
 * Client interface. Concrete S3 implementation (AWS SDK v3) is plugged in
 * when media upload is implemented. This keeps the rest of the app
 * independent of a specific SDK.
 */
export interface ObjectStorageClient {
  readonly config: StorageConfig;
  putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  healthCheck(): Promise<boolean>;
}

export function assertStorageConfigured(config: StorageConfig): void {
  if (!config.configured) {
    throw new StorageNotConfiguredError(
      "Configure object storage in Admin → Instance → Storage, or set STORAGE_* environment variables.",
    );
  }
}

/**
 * Build a public URL for an object key using publicUrl or path-style endpoint.
 */
export function buildPublicUrl(config: StorageConfig, key: string): string {
  if (config.publicUrl) {
    return `${config.publicUrl.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
  }
  if (config.forcePathStyle) {
    return `${config.endpoint.replace(/\/$/, "")}/${config.bucket}/${key.replace(/^\//, "")}`;
  }
  // Virtual-hosted style
  try {
    const u = new URL(config.endpoint);
    return `${u.protocol}//${config.bucket}.${u.host}/${key.replace(/^\//, "")}`;
  } catch {
    return `${config.endpoint}/${config.bucket}/${key}`;
  }
}
