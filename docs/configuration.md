# Configuration

Horizon separates **infrastructure environment variables** from **instance settings** editable in the admin panel.

## Environment (`.env`)

Required:

| Variable | Purpose |
|----------|---------|
| `INSTANCE_URL` | Public URL of this instance |
| `SESSION_SECRET` | Session signing (≥32 chars) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

Optional (also configurable in admin):

| Variable | Purpose |
|----------|---------|
| `STORAGE_*` | S3-compatible object storage |
| `SMTP_*` | Outbound email |

Networking:

| Variable | Default | Purpose |
|----------|---------|---------|
| `HTTP_PORT` | `25343` | Host port the whole site is published on, for the TLS reverse proxy in front |
| `HTTP_BIND_ADDR` | `127.0.0.1` | Interface `HTTP_PORT` binds to |
| `MINIO_BIND_ADDR` | `127.0.0.1` | Interface the MinIO API/console bind to |
| `CADDY_DOMAIN` | `horizon.european-commission-europa.eu` | Domain for the **optional** containerized proxy (`docker compose --profile edge up -d`) only |
| `ACME_EMAIL` | — | Let's Encrypt contact address for the containerized proxy |

A host-installed Caddy binary ignores `CADDY_DOMAIN`/`ACME_EMAIL` and takes its
domain from `infra/Caddyfile.host`. See [Installation](installation.md#reverse-proxy).

When both env and admin settings define storage or email, **environment wins**.

## Admin panel: Storage & Email

After first-run setup:

**Admin → Instance → Storage**

- Endpoint URL  
- Region  
- Bucket  
- Access key / Secret key  
- Force path-style  
- Public base URL  

**Admin → Instance → Email**

- Enable email  
- SMTP host / port / TLS  
- Username / password  
- From address  

Actions:

- **Test storage** — verifies configuration is present (`POST /api/instance/settings/test-storage`)
- **Test email** — queues a test message (`POST /api/instance/settings/test-email`)

Secrets are redacted in API responses (`••••••••`). Leaving a secret field empty on save keeps the previous value.

## Resolution order

```
runtime config = env (if set) → instance_settings (DB) → code defaults
```

Implemented in `@horizon/config`:

- `resolveStorageConfig(env, settings)`
- `resolveEmailConfig(env, settings)`

## API

```
GET  /api/instance                 # public info
GET  /api/instance/settings        # admin (secrets redacted)
PATCH /api/instance/settings       # admin update
POST /api/instance/settings/test-email
POST /api/instance/settings/test-storage
```

Body for PATCH (flat keys or `{ "settings": { ... } }`):

```json
{
  "storage.endpoint": "https://s3.example.com",
  "storage.bucket": "horizon",
  "storage.accessKey": "...",
  "storage.secretKey": "...",
  "email.enabled": true,
  "email.host": "smtp.example.com",
  "email.port": 587,
  "email.from": "Horizon <noreply@example.com>"
}
```

## Security notes

- Prefer putting access keys and SMTP passwords in environment variables in production.
- Admin-stored secrets are supported for easier self-hosting; restrict admin access and use HTTPS.
- Audit log (when enabled) records who changed settings; secret values are not written to the audit payload in plain form.
