# Authorization

Who is allowed to do what, and where that is decided.

Authentication — proving who you are — is covered in
[`authentication.md`](authentication.md) and [`sessions.md`](sessions.md). This
document is only about what happens after the session has been resolved.

## The shape of it

Three global guards run on every request, in this order:

| Guard | Job |
|-------|-----|
| `ThrottlerGuard` | Rate limiting. First, so a flood is cheap to reject. |
| `SessionGuard` | Resolves the session cookie onto `req.auth`, and rejects anything not marked `@Public()`. |
| `PermissionsGuard` | Enforces `@RequirePermissions(...)`. |

They are registered as `APP_GUARD` providers in `apps/api/src/app.module.ts`, so
they apply to every controller without anything being opted in.

## Routes are closed by default

A route with no decorator requires a session. Opening one is deliberate:

```ts
@Public()
@Get(":username")
async get(@Param("username") username: string) { … }
```

This is the important property: a route added next year is protected by the
fact that nobody remembered to think about it. The alternative — open by
default, closed when someone remembers — is how the `/instance/settings`
endpoints ended up writable by anonymous callers before this landed.

## Permissions

The keys live in `packages/shared/src/index.ts` as `PERMISSIONS`, and are stored
per role in the database (`Role` → `RolePermission` → `Permission`, joined to
accounts through `UserRole`). They are loaded on the same query that resolves
the session, so authorization costs no extra round trip.

```ts
@RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
@Patch("settings")
async updateSettings(@Body() body: Record<string, unknown>) { … }
```

Multiple keys are an AND, not an OR.

## Ownership

Some routes are both a self-service action and a moderation action. Those are
checked in the handler rather than by a decorator, using the helpers in
`apps/api/src/auth/authenticated-user.ts`:

```ts
assertSelfOrPermission(auth, username, PERMISSIONS.MODERATION_MANAGE);
```

`assertPermission` and `assertSignedIn` are there too, for cases where the
requirement depends on the body — clearing a badge needs
`verification.revoke`, while setting one needs `verification.grant`, and only
the request says which is happening.

## Identity is never taken from the request body

Creating a post used to accept an `author` field, and rating a Community Note
accepted a `rater`. Both now come from the session. The rating case mattered
more than it looks: the helpfulness threshold assumes distinct raters, and a
client-supplied name meant one reader could push a note to HELPFUL alone.

## The current map

| Route | Requirement |
|-------|-------------|
| `GET /health`, `/health/live`, `/health/ready` | open |
| `GET /instance` | open |
| `GET /users`, `/users/:username`, `/users/:username/affiliates` | open |
| `GET /posts`, `/posts/:id` | open |
| `GET /notes`, `/notes/:id` | open |
| `GET /setup` | open |
| `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me` | open |
| `GET /auth/sessions`, `POST /auth/sessions/revoke-others` | signed in |
| `POST /posts` | signed in; author from the session |
| `POST /notes`, `POST /notes/:id/ratings` | signed in; author and rater from the session |
| `PATCH /users/:username` | self, or `moderation.manage` |
| `POST /users/:username/affiliates` | the organisation itself, or `verification.grant` |
| `DELETE /users/:username/affiliation` | the affiliate, their organisation, or `verification.revoke` |
| `PATCH /users/:username/verification` | `verification.grant`, or `verification.revoke` when clearing |
| `PATCH /users/:username/status` | `users.suspend` |
| `GET /users/:username/verification/history` | `users.view` |
| `POST /users` | `system.manage` |
| `GET /instance/settings` | `settings.view` |
| `PATCH /instance/settings`, `POST /instance/settings/test-*` | `settings.edit` |
| `POST /setup` | open only while the instance has no accounts; `settings.edit` after |

## Bootstrapping

`POST /setup` is the one endpoint that must work with nobody signed in — on a
brand new instance there is no account that could hold a permission yet. It
checks for non-system accounts and requires `settings.edit` as soon as any
exist, so the window closes the moment the instance has an occupant.

The first administrator is made from the command line:

```
docker compose exec api node apps/api/dist/cli/create-admin.js <username> <email> <password>
```

That upserts an `administrator` role holding every key in `PERMISSIONS` and
assigns it. Re-running it resets the password, which is also the way back in
after a lockout.

## In the browser

`GET /auth/me` returns the caller's permission keys, and `useSession()` exposes
them as `can(permission)`. `RequirePermission` uses that to swap an admin page
for an explanation, and the Settings index only lists administration entries to
accounts that hold them.

None of that is a security boundary. It exists so nobody is shown a form they
cannot save; the API refuses the request either way.

## Not covered yet

- Suspended accounts cannot use a session, but their existing content stays visible.
- There is no moderator role shipped by default — only `administrator`, from the CLI. Roles are in the database, so others can be added, but there is no UI for it.
- Rate limits are global rather than per-account.
