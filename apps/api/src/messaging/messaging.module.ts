import { Module, forwardRef } from "@nestjs/common";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";
import { UsersModule } from "../users/users.module";
import { SocialModule } from "../social/social.module";

/** Direct messages, one-to-one and group. */
@Module({
  imports: [UsersModule, forwardRef(() => SocialModule)],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
