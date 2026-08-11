import { Body, Controller, Get, HttpException, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MinLength } from "class-validator";
import { AuthService, SESSION_COOKIE, SESSION_IDLE_DAYS } from "./auth.service";
import { UserDirectoryService } from "../users/user-directory.service";
import { DirectoryError } from "../users/directory-error";
import { CurrentUser, Public } from "./auth.decorators";
import type { AuthenticatedUser } from "./authenticated-user";

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

  @Public()
  @Post("register")
  async register(@Body() body: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.unwrap(async () => {
      const user = await this.auth.register(body);
      const { token, expiresAt } = await this.auth.createSession(user.id, this.clientMeta(req));
      this.setSessionCookie(res, token);
      // sessionToken is stored in the device vault so the account switcher can
      // re-activate this session in one click without asking for the password.
      return {
        user: await this.directory.get(user.username),
        sessionToken: token,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  @Public()
  @Post("login")
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.unwrap(async () => {
      const user = await this.auth.verifyCredentials(body.identifier, body.password);
      const { token, expiresAt } = await this.auth.createSession(user.id, this.clientMeta(req));
      this.setSessionCookie(res, token, body.remember ?? true);
      return {
        user: await this.directory.get(user.username),
        sessionToken: token,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  /**
   * One-click account switch: the device vault holds the session token from a
   * prior "Stay signed in" login. We re-attach that session as the HttpOnly
   * cookie — no password prompt.
   */
  @Public()
  @Post("switch")
  async switchAccount(
    @Body() body: { sessionToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.unwrap(async () => {
      const token = body.sessionToken?.trim();
      if (!token) {
        throw new DirectoryError("INVALID_SESSION", "Missing session token.", 400);
      }
      const resolved = await this.auth.resolveSession(token);
      if (!resolved) {
        throw new DirectoryError("INVALID_SESSION", "That session has expired. Sign in again.", 401);
      }
      this.setSessionCookie(res, token, true);
      return {
        user: await this.directory.get(resolved.user.username),
      };
    });
  }

  // Signing out while already signed out is not an error worth a 401.
  @Public()
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.revokeSession(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  }

  /**
   * Who the caller is, or null. The client uses this to decide what to render,
   * so being signed out is an answer rather than a failure — hence @Public.
   * `permissions` lets the client hide admin surfaces it would be refused.
   */
  @Public()
  @Get("me")
  async me(@CurrentUser() auth: AuthenticatedUser | null) {
    if (!auth) return { user: null, permissions: [] };
    return {
      user: await this.directory.tryGet(auth.username),
      permissions: [...auth.permissions],
    };
  }

  @Get("sessions")
  async sessions(@CurrentUser() auth: AuthenticatedUser) {
    return {
      current: auth.sessionId,
      sessions: await this.auth.listSessions(auth.id),
    };
  }

  @Post("sessions/revoke-others")
  async revokeOthers(@CurrentUser() auth: AuthenticatedUser) {
    const revoked = await this.auth.revokeOtherSessions(auth.id, auth.sessionId);
    return { revoked };
  }
}
