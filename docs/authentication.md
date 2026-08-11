# Authentication and sessions

Sign-up, sign-in and sessions are backed by Postgres, so an account survives a
restart. This is the part of the stack that has to be right, so the choices are
written down.

## Passwords

Hashed with **Argon2id** and never stored or logged in the clear. A sign-in
attempt against an unknown account still performs a hash, so response time does
not reveal whether the account exists. A duplicate sign-up says only "that
username or email is already registered" rather than confirming which — the
alternative is an account-enumeration oracle.

Minimum length is 10 characters, with no composition rules. Length beats
punctuation, and complexity rules push people toward predictable substitutions.

## Sessions

One row in `UserSession` per device, holding a **SHA-256 hash** of an opaque
32-byte random token — not the token itself, so a database leak does not hand
over live sessions. SHA-256 rather than Argon2id here on purpose: this is a
high-entropy random token, not a password, and the lookup runs on every request.

- **Cookie**: `horizon_session`, `HttpOnly`, `SameSite=Lax`, `Secure` in
  production, `Path=/`.
- **Idle expiry**: 30 days, extended on use. The extension is throttled to once
  a minute so a page view is not a database write.
- **Absolute cap**: 90 days, after which the session is refused however active
  it has been.
- **Stay signed in**: off means the cookie carries no `maxAge` and dies with the
  browser. The row keeps its own expiry either way.
- **Revocation** sets `revokedAt`. Every lookup checks it, so "sign out" and
  "sign out everywhere" are the same operation at different scopes.

A session is also refused if the account has been suspended or has
`loginDisabled` set, so suspending someone takes effect on their next request
rather than their next sign-in.

## Reserved and system accounts

Usernames that collide with routes (`settings`, `docs`, `about`, `admin`, …) are
reserved, along with `CommunityNotes`. System accounts hold no usable
credential and are refused at sign-in explicitly rather than relying on that.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/register` | Create an account and sign in |
| `POST` | `/api/auth/login` | Sign in (`{ identifier, password, remember? }`) |
| `POST` | `/api/auth/logout` | Revoke this session |
| `GET` | `/api/auth/me` | The current account, or `null` |
| `GET` | `/api/auth/sessions` | Devices this account is signed in on |
| `POST` | `/api/auth/sessions/revoke-others` | Sign out every other device |

`identifier` accepts either a username or an email address.

## Still to do

- Roles beyond `administrator`. Permission checks are enforced — see
  [`authorization.md`](authorization.md) — but the only role that ships is the
  one the CLI creates, and there is no UI for managing others.
- Multiple accounts signed in at once — designed in
  [the sessions proposal](sessions.md); switching currently asks for the other
  account's password.
- Password reset, email verification, and 2FA.
