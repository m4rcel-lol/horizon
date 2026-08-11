import { Body, Controller, Delete, Get, HttpException, Param, Patch, Post } from "@nestjs/common";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";
import { VERIFICATION_TYPES, type VerificationType } from "@horizon/shared";
import { DirectoryError, UserDirectoryService } from "./user-directory.service";

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
}

class SetStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";
}

/**
 * Accounts, verification tiers and affiliations.
 *
 * Authorization is not enforced yet — there is no auth module to enforce it
 * with. The permissions these routes will require already exist in
 * @horizon/shared: verification.grant and verification.revoke for the
 * verification routes, and organisation ownership for the affiliation routes.
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

  @Get()
  async list() {
    return { users: await this.directory.list() };
  }

  @Post()
  async create(@Body() body: CreateUserDto) {
    return this.unwrap(async () => ({ user: await this.directory.create(body) }));
  }

  @Get(":username")
  async get(@Param("username") username: string) {
    return this.unwrap(async () => ({ user: await this.directory.get(username) }));
  }

  @Patch(":username")
  async update(@Param("username") username: string, @Body() body: UpdateUserDto) {
    return this.unwrap(async () => ({ user: await this.directory.update(username, body) }));
  }

  /** Suspend or restore. System accounts refuse. */
  @Patch(":username/status")
  async setStatus(@Param("username") username: string, @Body() body: SetStatusDto) {
    return this.unwrap(async () => ({ user: await this.directory.setStatus(username, body.status) }));
  }

  @Patch(":username/verification")
  async setVerification(@Param("username") username: string, @Body() body: SetVerificationDto) {
    return this.unwrap(() => this.directory.setVerification(username, body.type, body.reason));
  }

  @Get(":username/verification/history")
  async history(@Param("username") username: string) {
    return this.unwrap(async () => ({ history: await this.directory.historyFor(username) }));
  }

  @Get(":username/affiliates")
  async affiliates(@Param("username") username: string) {
    return this.unwrap(async () => ({ affiliates: await this.directory.affiliates(username) }));
  }

  /** The organisation in the path affiliates the account in the body. */
  @Post(":username/affiliates")
  async affiliate(@Param("username") username: string, @Body() body: AffiliateDto) {
    return this.unwrap(() => this.directory.affiliate(username, body.username));
  }

  @Delete(":username/affiliation")
  async removeAffiliation(@Param("username") username: string) {
    return this.unwrap(async () => ({ user: await this.directory.removeAffiliation(username) }));
  }
}
