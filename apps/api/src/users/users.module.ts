import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UserDirectoryService } from "./user-directory.service";
import { DelegationService } from "./delegation.service";

/** Users, profiles, verification tiers, affiliations and delegation. */
@Module({
  controllers: [UsersController],
  providers: [UserDirectoryService, DelegationService],
  exports: [UserDirectoryService, DelegationService],
})
export class UsersModule {}
