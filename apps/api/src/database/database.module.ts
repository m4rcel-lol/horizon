import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** Global so every module can reach the database without re-importing. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
