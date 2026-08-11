import { z } from "zod";
import {
  DEFAULT_POST_MAX_LENGTH,
  DEFAULT_MAX_MEDIA_PER_POST,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from "@horizon/shared";

/**
 * Environment configuration (infrastructure).
 *
 * Required: NODE_ENV-related, INSTANCE_URL, SESSION_SECRET, DATABASE_URL, REDIS_URL
 *
 * Optional (can also be set via admin panel / instance settings):
 * - Object storage (S3-compatible)
 * - SMTP
 *
 * Prefer env for secrets in production. Admin panel values are used when env
 * is unset, so self-hosters can configure everything after first-run setup.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  INSTANCE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // Object storage — all optional; configure via admin if omitted
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_REGION: z.string().default("us-east-1").optional(),
  STORAGE_BUCKET: z.string().min(1).optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("true")
    .optional(),
  STORAGE_PUBLIC_URL: z.string().url().optional(),

  // SMTP — all optional; configure via admin if omitted
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  FEDERATION_ENABLED: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("false"),
  MAINTENANCE_MODE: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("false"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten());
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

/**
 * Instance settings stored in the database (admin-editable).
 * Cached in Redis. Secrets may live here for convenience; prefer env in production.
 */
export const DEFAULT_INSTANCE_SETTINGS = {
  // Branding / general
  "instance.name": "Horizon",
  "instance.description": "A community-first social platform",
  "instance.url": "",
  "instance.logo": "/assets/logo.svg",
  "instance.favicon": "/assets/favicon.ico",
  "instance.accentColor": "#1d9bf0",
  "instance.defaultTheme": "system",
  "instance.contactEmail": "",

  // Community Notes
  "notes.minRatings": 3,

  // Registration
  "registration.enabled": true,
  "registration.requireApproval": false,
  "registration.requireEmailVerification": true,

  // Posts & media limits
  "posts.maxLength": DEFAULT_POST_MAX_LENGTH,
  "posts.maxMedia": DEFAULT_MAX_MEDIA_PER_POST,
  "posts.editing.enabled": true,
  "posts.editing.windowMinutes": 60,
  "media.maxFileSize": DEFAULT_MAX_FILE_SIZE_BYTES,
  "media.allowedTypes": [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
  ],

  // Timelines
  "timeline.defaultMode": "following",
  "timeline.recommendations.enabled": true,

  // Moderation / federation
  "moderation.enabled": true,
  "federation.enabled": false,

  // Rate limits
  "security.rateLimits.login": 10,
  "security.rateLimits.registration": 5,
  "security.rateLimits.post": 30,

  // Analytics
  "analytics.enabled": true,

  // Setup
  "setup.completed": false,

  // -------------------------------------------------------------------------
  // Object storage (S3-compatible) — admin-configurable
  // Env vars override these when set.
  // -------------------------------------------------------------------------
  "storage.endpoint": "",
  "storage.region": "us-east-1",
  "storage.bucket": "horizon",
  "storage.accessKey": "",
  "storage.secretKey": "",
  "storage.forcePathStyle": true,
  "storage.publicUrl": "",
  "storage.configured": false, // true when usable credentials exist

  // -------------------------------------------------------------------------
  // Email / SMTP — admin-configurable
  // Env vars override these when set.
  // -------------------------------------------------------------------------
  "email.enabled": false,
  "email.host": "",
  "email.port": 587,
  "email.secure": false,
  "email.user": "",
  "email.password": "",
  "email.from": "",
  "email.configured": false,
} as const;

export type InstanceSettingKey = keyof typeof DEFAULT_INSTANCE_SETTINGS;

export function getDefaultSetting<K extends InstanceSettingKey>(
  key: K,
): (typeof DEFAULT_INSTANCE_SETTINGS)[K] {
  return DEFAULT_INSTANCE_SETTINGS[key];
}

/** Keys that contain secrets — redacted in public/admin list responses unless owner. */
export const SECRET_SETTING_KEYS = [
  "storage.accessKey",
  "storage.secretKey",
  "email.password",
] as const;

export type SecretSettingKey = (typeof SECRET_SETTING_KEYS)[number];

export function isSecretSettingKey(key: string): key is SecretSettingKey {
  return (SECRET_SETTING_KEYS as readonly string[]).includes(key);
}

/**
 * Resolved runtime storage config (env wins over instance settings).
 */
export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
  publicUrl?: string;
  configured: boolean;
};

/**
 * Resolved runtime email/SMTP config (env wins over instance settings).
 */
export type EmailConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  configured: boolean;
};

/**
 * Merge env + DB instance settings into a usable StorageConfig.
 * Env values take precedence when present and non-empty.
 */
export function resolveStorageConfig(
  env: Partial<EnvConfig>,
  settings: Record<string, unknown>,
): StorageConfig {
  const endpoint =
    (env.STORAGE_ENDPOINT && env.STORAGE_ENDPOINT.trim()) ||
    String(settings["storage.endpoint"] ?? "");
  const region =
    (env.STORAGE_REGION && String(env.STORAGE_REGION).trim()) ||
    String(settings["storage.region"] ?? "us-east-1");
  const bucket =
    (env.STORAGE_BUCKET && env.STORAGE_BUCKET.trim()) ||
    String(settings["storage.bucket"] ?? "horizon");
  const accessKey =
    (env.STORAGE_ACCESS_KEY && env.STORAGE_ACCESS_KEY.trim()) ||
    String(settings["storage.accessKey"] ?? "");
  const secretKey =
    (env.STORAGE_SECRET_KEY && env.STORAGE_SECRET_KEY.trim()) ||
    String(settings["storage.secretKey"] ?? "");
  const forcePathStyle =
    env.STORAGE_FORCE_PATH_STYLE !== undefined
      ? Boolean(env.STORAGE_FORCE_PATH_STYLE)
      : Boolean(settings["storage.forcePathStyle"] ?? true);
  const publicUrl =
    (env.STORAGE_PUBLIC_URL && env.STORAGE_PUBLIC_URL.trim()) ||
    String(settings["storage.publicUrl"] ?? "") ||
    undefined;

  const configured = Boolean(
    endpoint && bucket && accessKey && secretKey,
  );

  return {
    endpoint,
    region,
    bucket,
    accessKey,
    secretKey,
    forcePathStyle,
    publicUrl: publicUrl || undefined,
    configured,
  };
}

/**
 * Merge env + DB instance settings into a usable EmailConfig.
 * Env values take precedence when present and non-empty.
 */
export function resolveEmailConfig(
  env: Partial<EnvConfig>,
  settings: Record<string, unknown>,
): EmailConfig {
  const host =
    (env.SMTP_HOST && env.SMTP_HOST.trim()) ||
    String(settings["email.host"] ?? "");
  const port =
    env.SMTP_PORT !== undefined && env.SMTP_PORT !== null
      ? Number(env.SMTP_PORT)
      : Number(settings["email.port"] ?? 587);
  const secure =
    env.SMTP_SECURE !== undefined
      ? Boolean(env.SMTP_SECURE)
      : Boolean(settings["email.secure"] ?? false);
  const user =
    (env.SMTP_USER && env.SMTP_USER.trim()) ||
    String(settings["email.user"] ?? "");
  const password =
    (env.SMTP_PASSWORD && env.SMTP_PASSWORD.trim()) ||
    String(settings["email.password"] ?? "");
  const from =
    (env.SMTP_FROM && env.SMTP_FROM.trim()) ||
    String(settings["email.from"] ?? "");

  const configured = Boolean(host && from);
  const enabled =
    configured &&
    (settings["email.enabled"] === true ||
      settings["email.enabled"] === "true" ||
      Boolean(env.SMTP_HOST));

  return {
    enabled: Boolean(enabled),
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    user,
    password,
    from,
    configured,
  };
}

/** Admin UI field definitions for storage & email (used by API and frontend). */
export const STORAGE_SETTING_FIELDS = [
  { key: "storage.endpoint", label: "Endpoint URL", type: "url", secret: false },
  { key: "storage.region", label: "Region", type: "text", secret: false },
  { key: "storage.bucket", label: "Bucket", type: "text", secret: false },
  { key: "storage.accessKey", label: "Access key", type: "text", secret: true },
  { key: "storage.secretKey", label: "Secret key", type: "password", secret: true },
  { key: "storage.forcePathStyle", label: "Force path-style", type: "boolean", secret: false },
  { key: "storage.publicUrl", label: "Public base URL", type: "url", secret: false },
] as const;

export const EMAIL_SETTING_FIELDS = [
  { key: "email.enabled", label: "Enable email", type: "boolean", secret: false },
  { key: "email.host", label: "SMTP host", type: "text", secret: false },
  { key: "email.port", label: "SMTP port", type: "number", secret: false },
  { key: "email.secure", label: "Use TLS (secure)", type: "boolean", secret: false },
  { key: "email.user", label: "SMTP username", type: "text", secret: false },
  { key: "email.password", label: "SMTP password", type: "password", secret: true },
  { key: "email.from", label: "From address", type: "text", secret: false },
] as const;
