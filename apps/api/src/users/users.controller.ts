import { Body, Controller, Delete, Get, HttpException, Param, Patch, Post } from "@nestjs/common";
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";
import { PERMISSIONS, VERIFICATION_TYPES, type VerificationType } from "@horizon/shared";
import { DirectoryError, UserDirectoryService } from "./user-directory.service";
import { CurrentUser, Public, RequirePermissions } from "../auth/auth.decorators";
import {
  assertPermission,
  assertSelfOrPermission,
  type AuthenticatedUser,
} from "../auth/authenticated-user";

class CreateUserDto {
  @IsString()
  @Length(1, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: "username may only contain letters, numbers and underscores" })
  username!: string;

  @IsString()
  @Length(1, 50)
  displayName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsOptional()
  @IsIn(VERIFICATION_TYPES)
  verification?: VerificationType;
}

class SetVerificationDto {
  @IsIn(VERIFICATION_TYPES)
  type!: VerificationType;

  @IsOptional()
  @IsString()
  @Length(0, 280)
  reason?: string;
}

class AffiliateDto {
  @IsString()
  @Length(1, 20)
  username!: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  bannerUrl?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  pronouns?: string | null;

  @IsOptional()
  @IsString()
  birthday?: string | null;

  @IsOptional()
  @IsBoolean()
  isProtected?: boolean;
}

class SetStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";
}

/**
 * Accounts, verification tiers and affiliations.
 *
 * Reading the directory is open, because profiles and affiliate lists are
 * public pages. Everything that writes is either the account acting on itself
 * or an administrator holding the matching permission.
 */
@Controller("users")
export class UsersController {
  constructor(private readonly directory: UserDirectoryService) {}

  private async unwrap<T>(fn: () => Promise<T> | T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DirectoryError) {
        throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
      }
      throw error;
    }
  }

  @Public()
  @Get()
  async list() {
    return { users: await this.directory.list() };
  }

  /**
   * Create an account out of band, optionally already verified. This bypasses
   * registration entirely, so it is an instance-administration action.
   */
  @RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
  @Post()
  async create(@Body() body: CreateUserDto) {
    return this.unwrap(async () => ({ user: await this.directory.create(body) }));
  }

  @Public()
  @Get(":username")
  async get(@Param("username") username: string) {
    return this.unwrap(async () => ({ user: await this.directory.get(username) }));
  }

  /** Your own profile, or anyone's with the moderation permission. */
  @Patch(":username")
  async update(
    @Param("username") username: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    assertSelfOrPermission(auth, username, PERMISSIONS.MODERATION_MANAGE);
    return this.unwrap(async () => ({ user: await this.directory.update(username, body) }));
  }

  /** Suspend or restore. System accounts refuse. */
  @RequirePermissions(PERMISSIONS.USERS_SUSPEND)
  @Patch(":username/status")
  async setStatus(@Param("username") username: string, @Body() body: SetStatusDto) {
    return this.unwrap(async () => ({ user: await this.directory.setStatus(username, body.status) }));
  }

  /**
   * Granting and revoking are separate permissions, so the check depends on
   * which way the change goes: clearing a badge is a revoke.
   */
  @Patch(":username/verification")
  async setVerification(
    @Param("username") username: string,
    @Body() body: SetVerificationDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    assertPermission(
      auth,
      body.type === "NONE" ? PERMISSIONS.VERIFICATION_REVOKE : PERMISSIONS.VERIFICATION_GRANT,
    );
    return this.unwrap(() => this.directory.setVerification(username, body.type, body.reason));
  }

  /** Who granted what and when — a moderation record, not a public one. */
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  @Get(":username/verification/history")
  async history(@Param("username") username: string) {
    return this.unwrap(async () => ({ history: await this.directory.historyFor(username) }));
  }

  @Public()
  @Get(":username/affiliates")
  async affiliates(@Param("username") username: string) {
    return this.unwrap(async () => ({ affiliates: await this.directory.affiliates(username) }));
  }

  /**
   * The organisation in the path affiliates the account in the body.
   *
   * Only that organisation may do it — this is the route that hands out gold
   * badges, so letting any signed-in account call it for any organisation
   * would be the whole verification system undone.
   */
  @Post(":username/affiliates")
  async affiliate(
    @Param("username") username: string,
    @Body() body: AffiliateDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    assertSelfOrPermission(auth, username, PERMISSIONS.VERIFICATION_GRANT);
    return this.unwrap(() => this.directory.affiliate(username, body.username));
  }

  /** The affiliate may leave; their organisation, or an admin, may remove them. */
  @Delete(":username/affiliation")
  async removeAffiliation(@Param("username") username: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => {
      const target = await this.directory.get(username);
      const isSelf = auth.username.toLowerCase() === username.toLowerCase();
      const isTheirOrganisation =
        target.affiliatedTo?.username.toLowerCase() === auth.username.toLowerCase();
      if (!isSelf && !isTheirOrganisation) {
        assertPermission(auth, PERMISSIONS.VERIFICATION_REVOKE);
      }
      return { user: await this.directory.removeAffiliation(username) };
    });
  }
}
