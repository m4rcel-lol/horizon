# Horizon

**A community-first, self-hostable alternative to X**

Horizon is a production-grade, independently implemented social platform that captures the excellent interaction model and feature depth of modern microblogging platforms while remaining fully self-hostable, free of proprietary dependencies, and completely free of AI features.

## Features

- Timelines (Following chronological + non-AI recommendation feed)
- Profiles, posts, replies, reposts, quote posts
- Likes, bookmarks (with folders), lists, communities
- Notifications, direct messages, search, trends, hashtags, mentions
- Community Notes: reader-written context, rated by readers
- Polls, media (images/video), long-form posts, scheduled posts, drafts
- Content warnings, visibility controls, edit history
- Blocking, muting, reporting, full rule-based moderation
- Verification (standard / business / government / government organisation) with affiliations
- Comprehensive admin panel & instance configuration
- Optional ActivityPub federation (isolated module)
- Real-time updates via WebSockets
- Sign-up and sign-in with Argon2id passwords and persistent sessions
- Privacy controls, 2FA, WebAuthn, data export
- Docker-first deployment with Caddy

**Absolutely no AI features or dependencies.**

## Quick Start (Docker)

```bash
git clone https://github.com/m4rcel-lol/horizon.git
cd horizon
cp .env.example .env
# Edit .env with your settings (especially secrets and instance URL)
docker compose up -d
```

Compose publishes the whole site (SPA, API, media) on `127.0.0.1:25343` and does
not bind ports 80/443, so you can put your own TLS reverse proxy in front of it.
For the reference deployment at `horizon.european-commission-europa.eu`, that's Caddy running on the
host:

```bash
sudo cp infra/Caddyfile.host /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Prefer Docker to run the proxy as well? It's opt-in:

```bash
docker compose --profile edge up -d   # adds caddy:2-alpine on ports 80/443
```

Then open your instance URL. Visitors get a landing page; create an account and
you land on the timeline.

Database migrations run automatically when the API container starts, so a fresh
install builds its own schema with no extra step.

## Documentation

See the `docs/` directory:

- [Installation](docs/installation.md)
- [Configuration](docs/configuration.md)
- [Authentication & sessions](docs/authentication.md)
- [Authorization & permissions](docs/authorization.md)
- [Verification & affiliation](docs/verification.md)
- [Community Notes](docs/community-notes.md)
- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Development](docs/development.md)

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React, TypeScript, Vite, Tailwind CSS |
| Backend      | NestJS, TypeScript                  |
| Database     | PostgreSQL 16 + Prisma              |
| Cache/Queue  | Redis 7 + BullMQ                    |
| Storage      | S3-compatible (MinIO default)       |
| Real-time    | NestJS WebSockets                   |
| Reverse Proxy| Caddy                               |
| Auth         | Argon2id, secure sessions, 2FA      |
| Monorepo     | pnpm workspaces + Turborepo         |

## Project Structure

```
horizon/
├── apps/
│   ├── web/          # Main React frontend
│   ├── api/          # NestJS API server
│   ├── worker/       # Background job workers
│   └── admin/        # Admin panel (planned)
├── packages/
│   ├── ui/           # Shared design system
│   ├── database/     # Prisma schema, client, migrations
│   ├── auth/         # Authentication utilities
│   ├── storage/      # Object storage abstraction
│   ├── search/       # Search indexing
│   ├── moderation/   # Moderation logic
│   ├── federation/   # Optional ActivityPub
│   ├── config/       # Centralized configuration
│   └── shared/       # Shared types, utils, constants
├── assets/           # Logo, default avatar, verification badges
├── docs/
├── scripts/
├── tests/
├── infra/
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

AGPL-3.0

## Assets

Only five custom visual assets are required:

1. Site logo (`assets/logo.svg`)
2. Default profile picture (`assets/default-avatar.svg`)
3. Standard verified badge (`assets/verified.svg`)
4. Business verified badge (`assets/verified-business.svg`)
5. Government verified badge (`assets/verified-government.svg`)

All other UI icons are inline SVG. No proprietary assets are used.
