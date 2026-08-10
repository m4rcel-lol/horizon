import { z } from "zod";
import { DEFAULT_POST_MAX_LENGTH, DEFAULT_MAX_MEDIA_PER_POST, DEFAULT_MAX_FILE_SIZE_BYTES } from "@horizon/shared";

/**
 * Environment configuration (infrastructure secrets & URLs)
 * Validated at startup. Never store secrets in the database.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  INSTANCE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("true"),
  STORAGE_PUBLIC_URL: z.string().url().optional(),
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
 * These have defaults and are cached.
 */
export const DEFAULT_INSTANCE_SETTINGS = {
  "instance.name": "Horizon",
  "instance.description": "A community-first social platform",
  "instance.url": "",
  "instance.logo": "/assets/logo.svg",
  "instance.favicon": "/assets/favicon.ico",
  "instance.accentColor": "#1d9bf0",
  "instance.defaultTheme": "system",
  "registration.enabled": true,
  "registration.requireApproval": false,
  "registration.requireEmailVerification": true,
  "posts.maxLength": DEFAULT_POST_MAX_LENGTH,
  "posts.maxMedia": DEFAULT_MAX_MEDIA_PER_POST,
  "posts.editing.enabled": true,
  "posts.editing.windowMinutes": 60,
  "media.maxFileSize": DEFAULT_MAX_FILE_SIZE_BYTES,
  "media.allowedTypes": ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"],
  "timeline.defaultMode": "following",
  "timeline.recommendations.enabled": true,
  "moderation.enabled": true,
  "federation.enabled": false,
  "security.rateLimits.login": 10,
  "security.rateLimits.registration": 5,
  "security.rateLimits.post": 30,
  "analytics.enabled": true,
  "setup.completed": false,
} as const;

export type InstanceSettingKey = keyof typeof DEFAULT_INSTANCE_SETTINGS;

export function getDefaultSetting<K extends InstanceSettingKey>(key: K): (typeof DEFAULT_INSTANCE_SETTINGS)[K] {
  return DEFAULT_INSTANCE_SETTINGS[key];
}
