import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  DEFAULT_INSTANCE_SETTINGS,
  InstanceSettingKey,
  resolveStorageConfig,
  resolveEmailConfig,
  isSecretSettingKey,
  loadEnv,
  type StorageConfig,
  type EmailConfig,
  type EnvConfig,
} from "@horizon/config";
import { PrismaService } from "../database/prisma.service";

/**
 * Central instance settings service.
 *
 * - Defaults from code
 * - Overrides from the instance_setting table
 * - Env still wins for storage/SMTP when set
 *
 * The stored values are mirrored in memory because they are read on nearly
 * every request (branding, registration mode, resolved storage config) and
 * they change only when an administrator saves the settings form. Writes go to
 * Postgres first and update the mirror afterwards, so a failed write cannot
 * leave the process believing something was saved that was not.
 *
 * Until this landed the map *was* the store: the admin panel reported success
 * and the values were gone at the next restart.
 */
@Injectable()
export class InstanceSettingsService implements OnModuleInit {
  private cache = new Map<string, unknown>();
  private readonly logger = new Logger(InstanceSettingsService.name);
  private env: EnvConfig;

  constructor(private readonly prisma: PrismaService) {
    this.env = loadEnvSafe();
  }

  async onModuleInit() {
    // Seed defaults
    for (const [key, value] of Object.entries(DEFAULT_INSTANCE_SETTINGS)) {
      if (!this.cache.has(key)) {
        this.cache.set(key, value);
      }
    }
    await this.loadFromDatabase();
    // Reflect env-based configured flags
    this.refreshDerivedFlags();
  }

  /** Stored values win over the compiled defaults. */
  private async loadFromDatabase() {
    try {
      const rows = await this.prisma.instanceSetting.findMany({
        select: { key: true, value: true },
      });
      for (const row of rows) {
        // Stored as JSON, so a boolean stays a boolean and a number a number.
        this.cache.set(row.key, row.value as unknown);
      }
      this.logger.log(`Loaded ${rows.length} stored instance setting(s)`);
    } catch (error) {
      // A first run before `migrate deploy` has finished should not stop the
      // API from booting on its defaults.
      this.logger.warn(`Could not read stored instance settings: ${error}`);
    }
  }

  /** Load all settings (secrets redacted unless includeSecrets). */
  getAll(includeSecrets = false): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of this.cache.entries()) {
      if (!includeSecrets && isSecretSettingKey(key)) {
        out[key] = value ? "••••••••" : "";
        continue;
      }
      out[key] = value;
    }
    // Always expose resolved status flags
    const storage = this.getStorageConfig();
    const email = this.getEmailConfig();
    out["storage.configured"] = storage.configured;
    out["email.configured"] = email.configured;
    return out;
  }

  get<K extends InstanceSettingKey>(key: K): unknown {
    return this.cache.has(key)
      ? this.cache.get(key)
      : DEFAULT_INSTANCE_SETTINGS[key];
  }

  /**
   * Update one or more settings. Used by admin panel.
   * Empty string for secret fields means "leave unchanged".
   */
  async update(
    partial: Record<string, unknown>,
    actorId?: string,
  ): Promise<Record<string, unknown>> {
    const writes = new Map<string, unknown>();
    for (const [key, value] of Object.entries(partial)) {
      if (!(key in DEFAULT_INSTANCE_SETTINGS) && !key.startsWith("storage.") && !key.startsWith("email.") && !key.startsWith("instance.") && !key.startsWith("registration.") && !key.startsWith("posts.") && !key.startsWith("media.") && !key.startsWith("timeline.") && !key.startsWith("moderation.") && !key.startsWith("federation.") && !key.startsWith("security.") && !key.startsWith("analytics.") && !key.startsWith("setup.")) {
        // Allow known prefixes; skip unknown
        continue;
      }
      // Don't overwrite secrets with empty / redacted placeholder
      if (isSecretSettingKey(key)) {
        if (value === "" || value === "••••••••" || value === undefined || value === null) {
          continue;
        }
      }
      writes.set(key, value);
    }

    // Written before the mirror is touched: if this throws, the caller gets an
    // error and the process has not started reporting an unsaved value.
    await this.prisma.$transaction(
      [...writes].map(([key, value]) =>
        this.prisma.instanceSetting.upsert({
          where: { key },
          update: { value: value as never, updatedBy: actorId ?? null },
          create: { key, value: value as never, updatedBy: actorId ?? null },
        }),
      ),
    );

    for (const [key, value] of writes) this.cache.set(key, value);
    this.refreshDerivedFlags();
    return this.getAll(false);
  }

  getStorageConfig(): StorageConfig {
    return resolveStorageConfig(this.env, Object.fromEntries(this.cache));
  }

  getEmailConfig(): EmailConfig {
    return resolveEmailConfig(this.env, Object.fromEntries(this.cache));
  }

  /** Public instance info (no secrets). */
  getPublicInfo() {
    return {
      name: this.get("instance.name"),
      description: this.get("instance.description"),
      url: this.get("instance.url") || this.env.INSTANCE_URL,
      logo: this.get("instance.logo"),
      registrationEnabled: this.get("registration.enabled"),
      registrationApprovalRequired: this.get("registration.requireApproval"),
      federationEnabled: this.get("federation.enabled"),
      setupCompleted: this.get("setup.completed"),
      storageConfigured: this.getStorageConfig().configured,
      emailConfigured: this.getEmailConfig().configured,
    };
  }

  private refreshDerivedFlags() {
    const storage = resolveStorageConfig(this.env, Object.fromEntries(this.cache));
    const email = resolveEmailConfig(this.env, Object.fromEntries(this.cache));
    this.cache.set("storage.configured", storage.configured);
    this.cache.set("email.configured", email.configured);
  }
}

function loadEnvSafe(): EnvConfig {
  try {
    return loadEnv();
  } catch {
    // During early boot / tests without full env, return minimal defaults
    return {
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
      INSTANCE_URL: process.env.INSTANCE_URL || "http://localhost",
      SESSION_SECRET: process.env.SESSION_SECRET || "dev-secret-must-be-32-chars-min!!",
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost/horizon",
      REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
      FEDERATION_ENABLED: false,
      MAINTENANCE_MODE: false,
    } as EnvConfig;
  }
}
