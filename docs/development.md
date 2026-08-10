# Development

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres, Redis, MinIO)

## Setup

```bash
pnpm install
cp .env.example .env
# Adjust DATABASE_URL to localhost:5432 etc. if running infra in Docker
docker compose up -d postgres redis minio
pnpm db:generate
pnpm db:migrate:dev
```

## Running

```bash
# Terminal 1 – API
pnpm --filter @horizon/api dev

# Terminal 2 – Web
pnpm --filter @horizon/web dev
```

Web is available at http://localhost:5173 (proxies /api to the NestJS server).

## Project Conventions

- Strict TypeScript everywhere
- No AI dependencies or features
- All privileged actions authorized server-side
- Instance settings live in DB (with env for secrets)
- Migrations for every schema change
- Icons are inline SVG or open-source only
- Only the five supplied assets are required from the operator

## Testing

```bash
pnpm test
```

Unit + integration tests live under packages and apps. E2E with Playwright is planned under `tests/e2e`.

## Phased Implementation Status

See the master prompt phases. Current repository contains:

- Full monorepo structure
- Comprehensive Prisma schema covering all major entities
- Docker Compose with Caddy, Postgres, Redis, MinIO, API, Worker, Web
- Shared types & configuration system
- Health endpoints
- Frontend shell with responsive layout, navigation, icons, light/dark tokens
- Auth/login/register/setup/about page scaffolds
- Documentation skeleton

Core domain logic (auth implementation, post creation, timelines, DMs, admin panel, etc.) continues in subsequent phases following the architecture defined in `docs/architecture.md`.
