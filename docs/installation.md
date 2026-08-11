# Installation

## Requirements

- Docker & Docker Compose v2
- A TLS reverse proxy — either Caddy installed on the host (default, recommended)
  or the optional `caddy` compose service
- At least 2 GB RAM (4 GB+ recommended)
- Persistent disk for volumes

## How the site is exposed

Compose publishes the entire site — SPA, `/api`, `/ws` and `/media` — on a
single host port, `HTTP_PORT` (**25343** by default), bound to `127.0.0.1`. A
TLS reverse proxy in front of it serves the public domain:

```
https://horizon.european-commission-europa.eu → proxy (host Caddy or `--profile edge`) → 127.0.0.1:25343 → web container
                                                                                    ├── /api/*, /ws*  → api:3000
                                                                                    ├── /media/*      → minio:9000
                                                                                    └── everything else → SPA
```

Nothing else needs to be reachable from the internet; Postgres, Redis and MinIO
stay on the compose network (MinIO's ports are bound to loopback).

## Quick Start

```bash
git clone <repo> horizon
cd horizon
cp .env.example .env
```

Edit `.env`:

- Set `INSTANCE_URL` to your public URL (`https://horizon.european-commission-europa.eu`)
- Generate strong secrets:
  ```bash
  openssl rand -hex 32   # SESSION_SECRET
  openssl rand -hex 32   # CSRF_SECRET
  ```
- Adjust Postgres/Redis/MinIO credentials if desired
- Change `HTTP_PORT` only if 25343 is already taken on the host

Then:

```bash
docker compose up -d
curl -I http://127.0.0.1:25343/     # should return 200 from the web container
```

## Reverse proxy

### Option A — Caddy binary on the host (default)

Compose does **not** start a proxy container, so nothing competes for ports
80/443.

```bash
sudo cp infra/Caddyfile.host /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

`infra/Caddyfile.host` serves `horizon.european-commission-europa.eu`, redirects `www.horizon.european-commission-europa.eu` to
it, and proxies to `127.0.0.1:25343`. Caddy requests Let's Encrypt certificates
automatically once DNS points at the host. To use a different domain, edit the
site addresses in that file and update `INSTANCE_URL` in `.env`.

Any other proxy works the same way — point it at `127.0.0.1:25343` and forward
`Host` plus the usual `X-Forwarded-*` headers.

### Option B — containerized Caddy (opt-in)

If you would rather have Docker run the proxy, start the `edge` profile:

```bash
docker compose --profile edge up -d
```

This pulls `caddy:2-alpine`, binds ports 80/443, and reads `infra/Caddyfile`
using `CADDY_DOMAIN` and `ACME_EMAIL` from `.env`. Do not run this alongside a
host Caddy — they would both try to bind 80/443.

## First-run setup

On first boot the API will run migrations automatically (or use the worker/entrypoint).

Open the instance URL (`https://horizon.european-commission-europa.eu`) and visit `/setup` to complete
first-run configuration:

- Instance name & description
- Create the first administrator account
- Storage, registration, and basic moderation settings

After setup completes, `/setup` is locked until an administrator explicitly re-enables maintenance/setup mode.

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run safely on startup. Always backup the database and media volumes before major upgrades.

## Local Development (without full Docker)

```bash
pnpm install
# Start Postgres + Redis + MinIO via docker compose up postgres redis minio -d
cp .env.example .env
# Adjust DATABASE_URL etc. for local ports
pnpm db:generate
pnpm db:migrate:dev
pnpm --filter @horizon/api dev
pnpm --filter @horizon/web dev
```

## Database migrations

The API container runs `prisma migrate deploy` before it starts serving, so a
fresh install creates its own schema and an upgrade applies pending migrations
first. Running migrations by hand is only needed for local development outside
Docker:

```bash
DATABASE_URL=... pnpm --filter @horizon/database exec prisma migrate deploy
```

The schema needs the `citext` extension for case-insensitive usernames and
emails; the initial migration creates it, so the database user must be allowed
to `CREATE EXTENSION` (the default superuser in the bundled Postgres is).

## Production Notes

- Point DNS A/AAAA records for `horizon.european-commission-europa.eu` (and `www`) to the host
- Caddy obtains Let's Encrypt certificates automatically when the domain is publicly reachable
- Uploaded media is served from `https://horizon.european-commission-europa.eu/media` (proxied to MinIO), so `STORAGE_PUBLIC_URL` must match your public domain
- Use external managed Postgres/Redis/S3 if preferred by overriding the compose services and environment variables; with external storage, set `STORAGE_PUBLIC_URL` to that provider's URL and the `/media` route goes unused
- Never expose Postgres, Redis, or MinIO ports publicly — keep `MINIO_BIND_ADDR=127.0.0.1`
- Keep `HTTP_BIND_ADDR=127.0.0.1` unless the proxy runs on a different machine; if it does, firewall `HTTP_PORT` to the proxy's address
