import { Module, forwardRef } from "@nestjs/common";
import { SocialService } from "./social.service";
import { NotificationsService } from "./notifications.service";
import {
  BookmarksController,
  FollowController,
  NotificationsController,
  SearchController,
} from "./social.controller";
import { UsersModule } from "../users/users.module";
import { PostsModule } from "../posts/posts.module";

/**
 * Follows, notifications, bookmarks and search.
 *
 * Circular by nature: posting records notifications, and reading bookmarks or
 * search results renders posts. forwardRef lets the two modules depend on each
 * other without either owning the other.
 */
@Module({
  imports: [UsersModule, forwardRef(() => PostsModule)],
  controllers: [FollowController, NotificationsController, BookmarksController, SearchController],
  providers: [SocialService, NotificationsService],
  exports: [SocialService, NotificationsService],
})
export class SocialModule {}
