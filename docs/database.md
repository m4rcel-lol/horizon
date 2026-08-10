# Database

Horizon uses PostgreSQL with Prisma for schema management and migrations.

## Schema Location

`packages/database/prisma/schema.prisma`

## Key Entities

- **User** – identity, profile, verification, status
- **Post** – core content unit (original, reply, repost, quote)
- **Follow / Block / Mute**
- **Media** – uploaded files with processing metadata
- **Poll / PollOption / PollVote**
- **Notification**
- **Conversation / Message** – DMs
- **List / ListMember / ListFollower**
- **Community / CommunityMember / CommunityRole**
- **Draft / ScheduledPost**
- **Report / ModerationAction / AuditLog**
- **InstanceSetting / InstanceRule**
- **VerificationHistory**
- **FederatedInstance / FederatedUser** (optional)

## Migrations

```bash
pnpm db:migrate:dev     # development
pnpm db:migrate         # production (deploy)
```

Never edit the production schema manually. All changes go through migrations.

## Indexes

Critical indexes exist for:

- Timeline queries (`authorId + createdAt`)
- Hashtag trending
- Notification feeds
- Conversation message history
- Username / email uniqueness (case-insensitive via Citext)

## Full-text Search

Initial release uses PostgreSQL `tsvector` / full-text search for posts and users. Dedicated search engines can be added later without changing the public API.
