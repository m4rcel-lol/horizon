# Installation

## Requirements

- Docker & Docker Compose v2
- At least 2 GB RAM (4 GB+ recommended)
- Persistent disk for volumes

## Quick Start

```bash
git clone <repo> horizon
cd horizon
cp .env.example .env
```

Edit `.env`:

- Set `INSTANCE_URL` to your public URL (e.g. `https://social.example.com`)
- Generate strong secrets:
  ```bash
  openssl rand -hex 32   # SESSION_SECRET
  openssl rand -hex 32   # CSRF_SECRET
  ```
- Adjust Postgres/Redis/MinIO credentials if desired
- Set `CADDY_DOMAIN` to your domain (or `localhost` for local testing)

Then:

```bash
docker compose up -d
```

On first boot the API will run migrations automatically (or use the worker/entrypoint).

Open the instance URL and visit `/setup` to complete first-run configuration:

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

## Production Notes

- Point DNS A/AAAA records to the host
- Caddy obtains Let's Encrypt certificates automatically when the domain is publicly reachable
- Use external managed Postgres/Redis/S3 if preferred by overriding the compose services and environment variables
- Never expose Postgres, Redis, or MinIO ports publicly
