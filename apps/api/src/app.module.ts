import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PostsModule } from "./posts/posts.module";
import { InstanceModule } from "./instance/instance.module";
import { SetupModule } from "./setup/setup.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120,
      },
    ]),
    HealthModule,
    AuthModule,
    UsersModule,
    PostsModule,
    InstanceModule,
    SetupModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
