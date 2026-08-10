# Horizon Architecture

## Overview

Horizon is a modular monorepo designed for maintainability, security, and self-hosting. The system is split into clear applications and shared packages.

## Core Principles

- Separation of concerns
- Secure by default
- Explicit configuration (env + DB-backed instance settings)
- No AI anywhere
- Optional federation (isolated)
- Docker-first, single-compose deployment
- Cursor-based pagination for feeds
- Optimistic UI with proper rollback
- Strong typing end-to-end

## High-Level Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Caddy     │────▶│   Web App   │     │  Admin UI   │
│ (reverse    │     │  (React)    │     │  (React)    │
│  proxy +    │     └──────┬──────┘     └──────┬──────┘
│  TLS)       │            │                   │
└──────┬──────┘            └─────────┬─────────┘
       │                             │
       ▼                             ▼
┌──────────────────────────────────────────────┐
│                 NestJS API                   │
│  Auth · Posts · Users · DMs · Search · Admin │
└──────┬───────────────────────────────┬───────┘
       │                               │
       ▼                               ▼
┌─────────────┐                 ┌─────────────┐
│ PostgreSQL  │                 │    Redis    │
│  (primary)  │                 │ cache/queue │
└─────────────┘                 └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │   Worker    │
                                │ (BullMQ)    │
                                └──────┬──────┘
                                       │
                        ┌──────────────┼──────────────┐
                        ▼              ▼              ▼
                   Media process   Email/Scheduled  Trends/Fanout
                   Notifications   Federation       Cleanup
```

## Data Flow Examples

### Creating a Post
1. Client → API (authenticated, rate-limited)
2. Validate content length against instance setting
3. Process mentions/hashtags
4. Transaction: insert post + media links + hashtag relations
5. Queue media processing & notification fanout
6. Return post + optimistic UI confirmation

### Timeline (Following)
- Cursor-paginated query of posts from followed users
- Exclude muted/blocked
- No silent recommendation injection

### Recommendation Timeline ("For You")
Deterministic, explainable ranking based on:
- Followed accounts
- Explicit topic preferences
- Recency + interaction signals
- Popularity within language/community
- Explicit exclusions (mutes, blocks, word filters)

No ML models.

## Configuration Layers

1. **Environment variables** (secrets, infrastructure)
2. **Database `instance_settings`** (admin-editable, cached in Redis)
3. **Defaults** in code (fallback)

## Security Model

- All privileged actions authorized server-side with RBAC
- Argon2id password hashing
- Secure, rotating session cookies
- CSRF tokens
- Rate limiting per endpoint class
- File signature + MIME validation
- CSP, security headers
- Audit log for all admin actions

## Federation

Isolated package. When `federation.enabled = false` the entire module is inert. ActivityPub compatibility is the target when enabled.

## Media Pipeline

1. Client uploads to pre-signed URL or through API
2. Worker validates magic bytes, strips metadata, generates variants
3. Stores in S3-compatible bucket
4. Updates media records

## Real-time

WebSocket gateway authenticated via session/token.
Rooms: user notifications, conversation, timeline (optional).

## Deployment Topology (default)

Single `docker compose`:

- caddy
- api
- worker
- web (static or SSR)
- postgres
- redis
- minio (or external S3)

All volumes persistent. Healthchecks present.

## Storage & Email configuration

Object storage (S3-compatible) and SMTP are **optional in `.env`**.

Resolution order (env wins when set):

1. Environment variables (`STORAGE_*`, `SMTP_*`)
2. Database `instance_settings` (Admin → Instance → Storage / Email)
3. Code defaults

`@horizon/config` exposes `resolveStorageConfig` and `resolveEmailConfig`.
The admin API is under `/api/instance/settings` (GET/PATCH + test endpoints).
Secrets are redacted in responses; empty secret fields on update leave previous values unchanged.
