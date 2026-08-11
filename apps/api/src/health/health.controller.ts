import { Controller, Get, HttpException, Logger } from "@nestjs/common";
import { SOFTWARE_NAME, SOFTWARE_VERSION } from "@horizon/shared";
import { Public } from "../auth/auth.decorators";
import { PrismaService } from "../database/prisma.service";

// Compose's healthcheck has no cookie to send, so these must stay open.
@Public()
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Readiness: can this process actually serve a request?
   *
   * This used to return `database: "ok"` unconditionally without touching
   * anything, which is worse than having no probe at all — an orchestrator
   * reading it keeps routing traffic to an instance whose database is gone,
   * and a deploy that half-came-up reports healthy. It now runs a real query
   * and answers 503 when that fails, so "ready" means it.
   *
   * Liveness stays separate and stays cheap: a process that is up but cannot
   * reach Postgres should be taken out of the pool, not killed and restarted
   * into the same broken dependency.
   */
  @Get("ready")
  async ready() {
    const startedAt = Date.now();
    let database: "ok" | "unavailable" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      database = "unavailable";
      this.logger.error(`Readiness check failed: ${(error as Error).message}`);
    }

    const body = {
      status: database === "ok" ? "ready" : "degraded",
      checks: { database, latencyMs: Date.now() - startedAt },
      timestamp: new Date().toISOString(),
    };

    if (database !== "ok") throw new HttpException(body, 503);
    return body;
  }
}
