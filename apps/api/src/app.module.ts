import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PostsModule } from "./posts/posts.module";
import { InstanceModule } from "./instance/instance.module";
import { SetupModule } from "./setup/setup.module";
import { CommunityNotesModule } from "./notes/community-notes.module";
import { SessionGuard } from "./auth/session.guard";
import { PermissionsGuard } from "./auth/permissions.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PostsModule,
    InstanceModule,
    SetupModule,
    CommunityNotesModule,
  ],
  // Guards run in the order they are declared. Rate limiting comes first so a
  // flood is cheap to reject; SessionGuard then resolves the caller and closes
  // anything not marked @Public(); PermissionsGuard checks what that caller is
  // allowed to do.
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
