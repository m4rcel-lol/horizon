# Build stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @horizon/database generate || true
RUN pnpm --filter @horizon/api build || true

# Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
