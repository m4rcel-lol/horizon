import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { InstanceSettingsService } from "./instance-settings.service";
import {
  STORAGE_SETTING_FIELDS,
  EMAIL_SETTING_FIELDS,
} from "@horizon/config";
import { PERMISSIONS } from "@horizon/shared";
import { Public, RequirePermissions } from "../auth/auth.decorators";

/**
 * Instance & admin settings API.
 *
 * GET  /api/instance          — public info
 * GET  /api/instance/settings — admin: all settings (secrets redacted)
 * PATCH /api/instance/settings — admin: update settings (storage, email, branding, …)
 * POST /api/instance/settings/test-email — admin: send test email
 * POST /api/instance/settings/test-storage — admin: verify storage connectivity
 *
 * Only the public info route is open. Everything else needs settings.view or
 * settings.edit, enforced by PermissionsGuard.
 */
@Controller("instance")
export class InstanceController {
  constructor(private readonly settings: InstanceSettingsService) {}

  @Public()
  @Get()
  getPublic() {
    return this.settings.getPublicInfo();
  }

  @RequirePermissions(PERMISSIONS.SETTINGS_VIEW)
  @Get("settings")
  getSettings() {
    return {
      settings: this.settings.getAll(false),
      fields: {
        storage: STORAGE_SETTING_FIELDS,
        email: EMAIL_SETTING_FIELDS,
      },
      resolved: {
        storage: this.redactStorage(this.settings.getStorageConfig()),
        email: this.redactEmail(this.settings.getEmailConfig()),
      },
    };
  }

  @RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
  @Patch("settings")
  async updateSettings(@Body() body: Record<string, unknown>) {
    if (!body || typeof body !== "object") {
      return { error: { code: "INVALID_BODY", message: "Expected settings object" } };
    }
    // Accept either flat map or { settings: { ... } }
    const partial =
      body.settings && typeof body.settings === "object"
        ? (body.settings as Record<string, unknown>)
        : body;

    const updated = await this.settings.update(partial);
    return {
      settings: updated,
      resolved: {
        storage: this.redactStorage(this.settings.getStorageConfig()),
        email: this.redactEmail(this.settings.getEmailConfig()),
      },
    };
  }

  @RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
  @Post("settings/test-email")
  async testEmail(@Body() body: { to?: string }) {
    const email = this.settings.getEmailConfig();
    if (!email.configured) {
      return {
        error: {
          code: "EMAIL_NOT_CONFIGURED",
          message:
            "SMTP is not configured. Set values in admin settings or via SMTP_* environment variables.",
        },
      };
    }
    // Worker will send the actual message; here we only validate config shape
    return {
      ok: true,
      message: `Test email would be sent via ${email.host}:${email.port} from ${email.from} to ${body.to || email.from}. Wire this to the email worker when SMTP transport is implemented.`,
      configured: true,
    };
  }

  @RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
  @Post("settings/test-storage")
  async testStorage() {
    const storage = this.settings.getStorageConfig();
    if (!storage.configured) {
      return {
        error: {
          code: "STORAGE_NOT_CONFIGURED",
          message:
            "Object storage is not configured. Set endpoint, bucket, and credentials in admin settings or via STORAGE_* environment variables.",
        },
      };
    }
    return {
      ok: true,
      message: `Storage looks configured: ${storage.endpoint} / bucket ${storage.bucket}. Full connectivity check runs in the storage package when implemented.`,
      configured: true,
      endpoint: storage.endpoint,
      bucket: storage.bucket,
      region: storage.region,
      forcePathStyle: storage.forcePathStyle,
    };
  }

  private redactStorage(s: ReturnType<InstanceSettingsService["getStorageConfig"]>) {
    return {
      endpoint: s.endpoint,
      region: s.region,
      bucket: s.bucket,
      forcePathStyle: s.forcePathStyle,
      publicUrl: s.publicUrl,
      configured: s.configured,
      accessKey: s.accessKey ? "••••••••" : "",
      secretKey: s.secretKey ? "••••••••" : "",
      source: s.accessKey
        ? process.env.STORAGE_ACCESS_KEY
          ? "environment"
          : "instance_settings"
        : "none",
    };
  }

  private redactEmail(e: ReturnType<InstanceSettingsService["getEmailConfig"]>) {
    return {
      enabled: e.enabled,
      host: e.host,
      port: e.port,
      secure: e.secure,
      user: e.user,
      from: e.from,
      configured: e.configured,
      password: e.password ? "••••••••" : "",
      source: e.host
        ? process.env.SMTP_HOST
          ? "environment"
          : "instance_settings"
        : "none",
    };
  }
}
