import { Module, forwardRef } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { ScheduledPostsService } from "./scheduled-posts.service";
import { UsersModule } from "../users/users.module";
import { CommunityNotesModule } from "../notes/community-notes.module";
import { SocialModule } from "../social/social.module";
import { MediaModule } from "../media/media.module";

/** Posts, rendered with their author's live identity and any helpful notes. */
@Module({
  imports: [UsersModule, CommunityNotesModule, MediaModule, forwardRef(() => SocialModule)],
  controllers: [PostsController],
  providers: [PostsService, ScheduledPostsService],
  exports: [PostsService, ScheduledPostsService],
})
export class PostsModule {}
