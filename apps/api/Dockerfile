# Build stage
FROM node:20-alpine AS builder
# Prisma needs libssl to pick its query engine; without it the install warns
# "Please manually install OpenSSL" and the engine can fail to load at runtime.
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @horizon/database generate
# turbo builds the workspace dependencies (@horizon/shared, @horizon/config)
# first. A failure here fails the image rather than producing one with no
# dist/main.js to run.
RUN pnpm turbo run build --filter=@horizon/api...

# Runtime
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3000
# Apply pending migrations before serving: a fresh deployment must build its own
# schema, and an upgrade must not start against an older one.
CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/database/prisma/schema.prisma && node apps/api/dist/main.js"]
