FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @horizon/web build || true

FROM caddy:2-alpine
COPY --from=builder /app/apps/web/dist /usr/share/caddy
COPY apps/web/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
