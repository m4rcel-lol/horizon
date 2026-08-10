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

  private unwrap<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof DirectoryError) {
        throw new HttpException({ error: { code: error.code, message: error.message } }, error.status);
      }
      throw error;
    }
  }

  @Get()
  list() {
    return { users: this.directory.list() };
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.unwrap(() => ({ user: this.directory.create(body) }));
  }

  @Get(":username")
  get(@Param("username") username: string) {
    return this.unwrap(() => ({ user: this.directory.get(username) }));
  }

  @Patch(":username/verification")
  setVerification(@Param("username") username: string, @Body() body: SetVerificationDto) {
    return this.unwrap(() => this.directory.setVerification(username, body.type, body.reason));
  }

  @Get(":username/verification/history")
  history(@Param("username") username: string) {
    return this.unwrap(() => ({ history: this.directory.historyFor(username) }));
  }

  @Get(":username/affiliates")
  affiliates(@Param("username") username: string) {
    return this.unwrap(() => ({ affiliates: this.directory.affiliates(username) }));
  }

  /** The organisation in the path affiliates the account in the body. */
  @Post(":username/affiliates")
  affiliate(@Param("username") username: string, @Body() body: AffiliateDto) {
    return this.unwrap(() => this.directory.affiliate(username, body.username));
  }

  @Delete(":username/affiliation")
  removeAffiliation(@Param("username") username: string) {
    return this.unwrap(() => ({ user: this.directory.removeAffiliation(username) }));
  }
}
