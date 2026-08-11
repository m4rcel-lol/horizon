# Account switching & session persistence

## Goals

1. **Stay signed in** after closing the tab or browser (until the session expires or the user signs out).
2. **Multiple accounts** on one device — switch without re-entering passwords.
3. **No password storage** on the client — only opaque tokens issued by the server.

## Architecture

### Active session

- Prefer **HttpOnly, Secure, SameSite=Lax** session cookies for the *active* account.
- Access token lifetime: short (e.g. 15–60 minutes).
- Refresh token / session row in Postgres (`user_sessions`) with rotation on use.
- `SESSION_SECRET` signs server-side session records; never trust client claims alone.

### Multi-account vault (client)

`apps/web/src/lib/sessions.ts` keeps a roster of accounts the user has opted to remember:

| Field | Purpose |
|-------|---------|
| `userId` | Stable id |
| `username` / `displayName` / `avatarUrl` | UI only |
| `token` | Refresh or long-lived session token |
| `expiresAt` | Client-side expiry hint |
| `lastUsedAt` | Sort order in the switcher |

Storage key: `horizon:account-vault`  
Active id: `horizon:active-account-id`

### Switch flow

1. User picks another account in **Settings → Account** or the **More** menu.
2. Client sets active id and attaches that account’s token on subsequent API calls (`Authorization: Bearer …` or a switch endpoint).
3. Preferred production path: `POST /api/auth/switch { userId }` exchanges a stored refresh token for a new cookie session (server validates and rotates).

### Login options

- **Stay signed in on this device** — write into the vault + long-lived refresh.
- **This session only** — memory / sessionStorage; cleared when the tab closes.

### Logout

- **Remove** one account from the vault + `POST /api/auth/logout` for that session.
- **Sign out of all accounts** — clear vault + `POST /api/auth/logout-all`.

### Security

- XSS can steal localStorage tokens → strict CSP, no `dangerouslySetInnerHTML` for user HTML without sanitization.
- All privileged API routes authorize via server session, not client-supplied user ids.
- Audit login, switch, and logout events when AuthModule is complete.

## UI entry points

- **More** (sidebar) → Settings, Account switcher list, Add account, Log out
- **Settings → Appearance** — theme (light / dark / system)
- **Settings → Account** — full vault management

## Status

- Client vault + Settings UI: implemented
- Server cookie sessions + switch endpoint: AuthModule still to be completed; UI is ready to call it
