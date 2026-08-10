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

## Building

```bash
pnpm turbo run build                            # whole workspace, in dependency order
pnpm turbo run build --filter=@horizon/web...   # one app plus the packages it needs
```

Apps import workspace packages from their built output, so `@horizon/shared`,
`@horizon/config` and `@horizon/database` must be built first — turbo resolves
that ordering. The Dockerfiles run the same commands and deliberately do **not**
swallow failures: a broken build fails the image instead of producing one with
no `dist/` to run.

## Theming

The interface follows X's current visual language: a monochrome primary action
(white pill on black, black pill on white), blue reserved for links, active tabs
and focus, and 15px base type.

Tailwind runs in `darkMode: "class"`, so the theme is the `dark` class on
`<html>`:

- `index.html` sets it before first paint, so there is no flash of the wrong theme
- `src/theme.ts` resolves the saved choice (`horizon:theme` in localStorage),
  falling back to `prefers-color-scheme` and following OS changes while no
  explicit choice is stored
- the toggle lives at the bottom of the left rail

Colors are CSS custom properties defined once in `src/index.css` — add new ones
there rather than hard-coding hex values in components.

## Brand assets

The five operator-supplied assets live once at the repo root in `assets/` and are
served at `/assets/*.svg` in both dev and production: a small middleware in
`vite.config.ts` serves them during development, and the web image copies them
next to the built bundle. Keep that single source — do not duplicate them into
`apps/web`.

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
- Frontend shell with responsive layout, navigation, icons, and a working light/dark theme
- Auth/login/register/setup/about page scaffolds (forms are not yet wired to the API)
- Documentation skeleton

Core domain logic (auth implementation, post creation, timelines, DMs, admin panel, etc.) continues in subsequent phases following the architecture defined in `docs/architecture.md`.
