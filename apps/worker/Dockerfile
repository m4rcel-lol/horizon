FROM node:20-alpine AS builder
# Prisma needs libssl to pick its query engine; without it the install warns
# "Please manually install OpenSSL" and the engine can fail to load at runtime.
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @horizon/database generate
RUN pnpm turbo run build --filter=@horizon/worker...

FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
COPY --from=builder /app /app
CMD ["node", "apps/worker/dist/main.js"]
