import { Module, forwardRef } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { UsersModule } from "../users/users.module";
import { CommunityNotesModule } from "../notes/community-notes.module";
import { SocialModule } from "../social/social.module";

/** Posts, rendered with their author's live identity and any helpful notes. */
@Module({
  imports: [UsersModule, CommunityNotesModule, forwardRef(() => SocialModule)],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
