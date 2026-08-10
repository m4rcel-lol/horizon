import { Module } from "@nestjs/common";
import { SetupController } from "./setup.controller";
import { InstanceModule } from "../instance/instance.module";

@Module({
  imports: [InstanceModule],
  controllers: [SetupController],
})
export class SetupModule {}
