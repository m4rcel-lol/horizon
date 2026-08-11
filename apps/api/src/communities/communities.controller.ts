import { Body, Controller, Get, HttpException, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, Length } from "class-validator";
import { CommunitiesService } from "./communities.service";
import { DirectoryError } from "../users/directory-error";
import { CurrentUser, Public } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/authenticated-user";

class CreateCommunityDto {
  @IsString()
  @Length(3, 60)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

class SetFlagDto {
  @IsBoolean()
  on!: boolean;
}

@Controller("communities")
export class CommunitiesController {
  constructor(private readonly communities: CommunitiesService) {}

  private async unwrap<T>(fn: () => Promise<T>): Promise<T> {
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
  async list(@CurrentUser() auth: AuthenticatedUser | null, @Query("user") user?: string) {
    const viewer = auth?.id ?? null;
    return {
      communities: user
        ? await this.communities.forUser(user, viewer)
        : await this.communities.list(viewer),
    };
  }

  /** Verified accounts only — checked in the service, which owns the rule. */
  @Post()
  async create(@Body() body: CreateCommunityDto, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({
      community: await this.communities.create({ ownerId: auth.id, ...body }),
    }));
  }

  @Public()
  @Get(":slug")
  async get(@Param("slug") slug: string, @CurrentUser() auth: AuthenticatedUser | null) {
    return this.unwrap(async () => ({
      community: await this.communities.get(slug, auth?.id ?? null),
    }));
  }

  @Put(":slug/membership")
  async setMembership(
    @Param("slug") slug: string,
    @Body() body: SetFlagDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(async () => ({
      community: await this.communities.setMembership(slug, auth.id, body.on),
    }));
  }

  @Patch(":slug")
  async update(
    @Param("slug") slug: string,
    @Body() body: { avatarUrl?: string | null; bannerUrl?: string | null; description?: string },
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(async () => ({
      community: await this.communities.update(slug, auth.id, body),
    }));
  }

  @Public()
  @Get(":slug/posts")
  async posts(@Param("slug") slug: string, @CurrentUser() auth: AuthenticatedUser | null) {
    return this.unwrap(async () => ({
      posts: await this.communities.posts(slug, auth?.id ?? null),
    }));
  }
}
