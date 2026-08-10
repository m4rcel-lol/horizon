import { Module } from "@nestjs/common";
import { InstanceController } from "./instance.controller";
import { InstanceSettingsService } from "./instance-settings.service";

@Module({
  controllers: [InstanceController],
  providers: [InstanceSettingsService],
  exports: [InstanceSettingsService],
})
export class InstanceModule {}
