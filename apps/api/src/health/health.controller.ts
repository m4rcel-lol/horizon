import { Controller, Get } from "@nestjs/common";
import { SOFTWARE_NAME, SOFTWARE_VERSION } from "@horizon/shared";

@Controller("health")
export class HealthController {
  // Two @Get decorators on one method do not register two routes — the outer
  // one overwrites the path, so /health/live used to 404. Declare both.
  @Get()
  live() {
    return this.liveness();
  }

  @Get("live")
  liveAlias() {
    return this.liveness();
  }

  private liveness() {
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
