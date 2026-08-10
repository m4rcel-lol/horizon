import { Body, Controller, Get, Post } from "@nestjs/common";
import { InstanceSettingsService } from "../instance/instance-settings.service";

/**
 * First-run setup. Disabled after setup.completed = true
 * unless an admin re-enables maintenance/setup mode.
 */
@Controller("setup")
export class SetupController {
  constructor(private readonly settings: InstanceSettingsService) {}

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

  @Post()
  async complete(
    @Body()
    body: {
      instanceName?: string;
      instanceDescription?: string;
      storage?: Record<string, unknown>;
      email?: Record<string, unknown>;
      // owner account fields handled when auth is implemented
    },
  ) {
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
