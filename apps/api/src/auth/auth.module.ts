import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { InstanceModule } from "../instance/instance.module";

/** Registration, sign-in, and persistent sessions. */
@Module({
  imports: [UsersModule, InstanceModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
