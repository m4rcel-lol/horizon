import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaClient } from "@horizon/database";

/**
 * The database connection, shared across the API.
 *
 * Accounts and sessions live here rather than in memory: a sign-up has to
 * survive a restart, or people lose their account every time the server is
 * redeployed.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
