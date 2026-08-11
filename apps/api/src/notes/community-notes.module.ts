import { Module } from "@nestjs/common";
import { InstanceModule } from "../instance/instance.module";
import { CommunityNotesController } from "./community-notes.controller";
import { CommunityNotesService } from "./community-notes.service";

/** Community Notes: reader-written context on posts, rated by readers. */
@Module({
  imports: [InstanceModule],
  controllers: [CommunityNotesController],
  providers: [CommunityNotesService],
  exports: [CommunityNotesService],
})
export class CommunityNotesModule {}
