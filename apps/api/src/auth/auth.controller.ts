import { Body, Controller, Get, HttpException, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MinLength } from "class-validator";
import { AuthService, SESSION_COOKIE, SESSION_IDLE_DAYS } from "./auth.service";
import { UserDirectoryService } from "../users/user-directory.service";
import { DirectoryError } from "../users/directory-error";

class RegisterDto {
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Username may only contain letters, numbers and underscores",
  })
  username!: string;

  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;

  @IsString()
  @MinLength(10, { message: "Use at least 10 characters" })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  displayName?: string;
}

class LoginDto {
  @IsString()
  @Length(1, 320)
  identifier!: string;

  @IsString()
  @Length(1, 200)
  password!: string;

  /** Off on a shared machine: the cookie then dies with the browser. */
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly directory: UserDirectoryService,
  ) {}

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

  private setSessionCookie(res: Response, token: string, remember = true) {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      // The site is served over TLS by the proxy in front; the cookie must not
      // travel over plain HTTP in production.
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Without maxAge this is a session cookie: it disappears when the
      // browser closes, which is what "stay signed in: off" has to mean.
      ...(remember ? { maxAge: SESSION_IDLE_DAYS * 86400_000 } : {}),
    });
  }

  private clientMeta(req: Request) {
    return {
      userAgent: req.get("user-agent") ?? undefined,
      ipAddress: (req.get("x-forwarded-for")?.split(",")[0] ?? req.ip)?.trim(),
    };
  }

  @Post("register")
  async register(@Body() body: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.unwrap(async () => {
      const user = await this.auth.register(body);
      const { token } = await this.auth.createSession(user.id, this.clientMeta(req));
      this.setSessionCookie(res, token);
      return { user: await this.directory.get(user.username) };
    });
  }

  @Post("login")
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.unwrap(async () => {
      const user = await this.auth.verifyCredentials(body.identifier, body.password);
      const { token } = await this.auth.createSession(user.id, this.clientMeta(req));
      this.setSessionCookie(res, token, body.remember ?? true);
      return { user: await this.directory.get(user.username) };
    });
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.revokeSession(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  }

  /** Who the caller is, or null. The client uses this to decide what to render. */
  @Get("me")
  async me(@Req() req: Request) {
    const session = await this.auth.resolveSession(req.cookies?.[SESSION_COOKIE]);
    if (!session) return { user: null };
    const user = await this.directory.tryGet(session.user.username);
    return { user };
  }

  @Get("sessions")
  async sessions(@Req() req: Request) {
    const session = await this.auth.resolveSession(req.cookies?.[SESSION_COOKIE]);
    if (!session) throw new HttpException({ error: { code: "NOT_SIGNED_IN", message: "Sign in first." } }, 401);
    return {
      current: session.sessionId,
      sessions: await this.auth.listSessions(session.user.id),
    };
  }

  @Post("sessions/revoke-others")
  async revokeOthers(@Req() req: Request) {
    const session = await this.auth.resolveSession(req.cookies?.[SESSION_COOKIE]);
    if (!session) throw new HttpException({ error: { code: "NOT_SIGNED_IN", message: "Sign in first." } }, 401);
    const revoked = await this.auth.revokeOtherSessions(session.user.id, session.sessionId);
    return { revoked };
  }
}
