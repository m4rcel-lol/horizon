import { Body, Controller, Delete, Get, HttpException, Param, Post, Put } from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Length } from "class-validator";
import { MessagingService, type DmPermission } from "./messaging.service";
import { DirectoryError } from "../users/directory-error";
import { CurrentUser } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/authenticated-user";

class CreateConversationDto {
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  usernames!: string[];

  @IsOptional()
  @IsString()
  @Length(0, 60)
  title?: string;
}

class SendMessageDto {
  @IsString()
  @Length(1, 4000)
  content!: string;
}

class DmPermissionDto {
  @IsIn(["everyone", "mutuals", "following", "none"])
  dmPermission!: DmPermission;
}

/**
 * Direct messages.
 *
 * Every route is closed — there is no public view of a conversation — and each
 * one resolves membership before it does anything, so a thread id is not a
 * capability.
 */
@Controller("messages")
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

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

  @Get()
  async list(@CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({ conversations: await this.messaging.list(auth.id) }));
  }

  /** Total unread, for the badge. Declared before `:id` so it is not read as one. */
  @Get("unread-count")
  async unread(@CurrentUser() auth: AuthenticatedUser) {
    return { count: await this.messaging.unreadCount(auth.id) };
  }

  /** Your own who-can-message-me setting. */
  @Get("settings")
  async settings(@CurrentUser() auth: AuthenticatedUser) {
    return { dmPermission: await this.messaging.dmPermissionFor(auth.id) };
  }

  @Put("settings")
  async setSettings(@Body() body: DmPermissionDto, @CurrentUser() auth: AuthenticatedUser) {
    return this.messaging.setDmPermission(auth.id, body.dmPermission);
  }

  /** Whether the caller may message this account, so the profile can say so. */
  @Get("can-message/:username")
  async canMessage(@Param("username") username: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(() => this.messaging.canMessageUsername(auth.id, username));
  }

  @Post()
  async create(@Body() body: CreateConversationDto, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({
      conversation: await this.messaging.createConversation(auth.id, body.usernames, body.title),
    }));
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({
      conversation: await this.messaging.getConversation(id, auth.id),
    }));
  }

  @Get(":id/messages")
  async messages(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(async () => ({ messages: await this.messaging.messages(id, auth.id) }));
  }

  @Post(":id/messages")
  async send(
    @Param("id") id: string,
    @Body() body: SendMessageDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(async () => ({
      message: await this.messaging.send(id, auth.id, body.content),
    }));
  }

  @Post(":id/read")
  async markRead(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(() => this.messaging.markRead(id, auth.id));
  }

  @Delete(":id/membership")
  async leave(@Param("id") id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.unwrap(() => this.messaging.leave(id, auth.id));
  }

  @Delete("message/:messageId")
  async deleteMessage(
    @Param("messageId") messageId: string,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.unwrap(() => this.messaging.deleteMessage(messageId, auth.id));
  }
}
