import { Body, Controller, Get, Post } from "@nestjs/common";
import { PERMISSIONS } from "@horizon/shared";
import { InstanceSettingsService } from "../instance/instance-settings.service";
import { PrismaService } from "../database/prisma.service";
import { CurrentUser, Public } from "../auth/auth.decorators";
import { assertPermission, type AuthenticatedUser } from "../auth/authenticated-user";

/**
 * First-run setup. Disabled after setup.completed = true
 * unless an admin re-enables maintenance/setup mode.
 */
@Controller("setup")
export class SetupController {
  constructor(
    private readonly settings: InstanceSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  /** The web shell asks this before rendering, signed out, to decide what to show. */
  @Public()
  @Get()
  status() {
    const completed = Boolean(this.settings.get("setup.completed"));
    return {
      completed,
      available: !completed,
      message: completed
        ? "Setup already completed. Re-enable via administrator maintenance mode."
        : "Setup is available. Complete instance configuration and create the owner account.",
    };
  }

  /**
   * Completing setup writes storage and SMTP credentials, so it cannot stay
   * open once the instance has occupants. On a genuinely empty instance there
   * is nobody who could hold a permission yet, which is the one moment this
   * has to run unauthenticated; after that it is an administrator action.
   */
  @Public()
  @Post()
  async complete(
    @Body()
    body: {
      instanceName?: string;
      instanceDescription?: string;
      storage?: Record<string, unknown>;
      email?: Record<string, unknown>;
    },
    @CurrentUser() auth: AuthenticatedUser | null,
  ) {
    const occupants = await this.prisma.user.count({ where: { isSystem: false } });
    if (occupants > 0) assertPermission(auth, PERMISSIONS.SETTINGS_EDIT);

    if (Boolean(this.settings.get("setup.completed"))) {
      return {
        error: {
          code: "SETUP_ALREADY_COMPLETED",
          message: "Setup has already been completed.",
        },
      };
    }

    const updates: Record<string, unknown> = {
      "setup.completed": true,
    };
    if (body.instanceName) updates["instance.name"] = body.instanceName;
    if (body.instanceDescription)
      updates["instance.description"] = body.instanceDescription;

    if (body.storage) {
      for (const [k, v] of Object.entries(body.storage)) {
        updates[`storage.${k}`] = v;
      }
    }
    if (body.email) {
      for (const [k, v] of Object.entries(body.email)) {
        updates[`email.${k}`] = v;
      }
    }

    await this.settings.update(updates);
    return {
      ok: true,
      instance: this.settings.getPublicInfo(),
    };
  }
}
