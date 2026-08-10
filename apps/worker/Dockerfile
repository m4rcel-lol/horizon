FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @horizon/database generate
RUN pnpm turbo run build --filter=@horizon/worker...

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
CMD ["node", "apps/worker/dist/main.js"]
