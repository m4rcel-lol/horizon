FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile || pnpm install
# turbo resolves the workspace build order (@horizon/shared before the app).
# No `|| true` here: a failed build must fail the image, not ship an empty one.
RUN pnpm turbo run build --filter=@horizon/web...

FROM caddy:2-alpine
COPY --from=builder /app/apps/web/dist /usr/share/caddy
# Brand assets live once at the repo root and are served from the same /assets
# path the SPA and index.html reference. Vite's own output is hashed, so the
# two sets never collide.
COPY assets /usr/share/caddy/assets
COPY apps/web/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
