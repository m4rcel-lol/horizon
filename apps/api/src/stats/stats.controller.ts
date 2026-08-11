import { Controller, Get, HttpException, Param } from "@nestjs/common";
import { PERMISSIONS } from "@horizon/shared";
import { StatsService } from "./stats.service";
import { DirectoryError } from "../users/directory-error";
import { Public, RequirePermissions } from "../auth/auth.decorators";

@Controller("stats")
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  /** Instance-wide numbers: a moderation view, not a public one. */
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  @Get("instance")
  async instance() {
    return { stats: await this.stats.instance() };
  }

  /**
   * One account's numbers.
   *
   * Public, because every figure in it is already derivable by counting what
   * is on the profile — hiding the total would be a pretence.
   */
  @Public()
  @Get("user/:username")
  async user(@Param("username") username: string) {
    try {
      return { stats: await this.stats.forUser(username) };
    } catch (error) {
      if (error instanceof DirectoryError) {
        throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
      }
      throw error;
    }
  }
}
