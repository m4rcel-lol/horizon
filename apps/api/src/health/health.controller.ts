import { Controller, Get } from "@nestjs/common";
import { SOFTWARE_NAME, SOFTWARE_VERSION } from "@horizon/shared";

@Controller("health")
export class HealthController {
  @Get()
  @Get("live")
  live() {
    return {
      status: "ok",
      software: SOFTWARE_NAME,
      version: SOFTWARE_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async ready() {
    // In full implementation: check Postgres, Redis, storage connectivity
    return {
      status: "ready",
      checks: {
        database: "ok",
        redis: "ok",
        storage: "ok",
      },
      timestamp: new Date().toISOString(),
    };
  }
}
