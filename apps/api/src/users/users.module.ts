import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UserDirectoryService } from "./user-directory.service";

/** Users, profiles, verification tiers and affiliations. */
@Module({
  controllers: [UsersController],
  providers: [UserDirectoryService],
  exports: [UserDirectoryService],
})
export class UsersModule {}
