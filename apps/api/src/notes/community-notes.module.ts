import { Module } from "@nestjs/common";
import { CommunityNotesController } from "./community-notes.controller";
import { CommunityNotesService } from "./community-notes.service";

/** Community Notes: reader-written context on posts, rated by readers. */
@Module({
  controllers: [CommunityNotesController],
  providers: [CommunityNotesService],
  exports: [CommunityNotesService],
})
export class CommunityNotesModule {}
