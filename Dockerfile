# ── Stage 1: BUILD ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build/maintenances-ms

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY rideglory-common-lib ../rideglory-common-lib
COPY rideglory-contracts ../rideglory-contracts

COPY maintenances-ms/package.json maintenances-ms/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY maintenances-ms/ .
RUN pnpm exec prisma generate
RUN pnpm build

# ── Stage 2: RUNTIME ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /build/maintenances-ms

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY rideglory-common-lib ../rideglory-common-lib
COPY rideglory-contracts ../rideglory-contracts

COPY maintenances-ms/package.json maintenances-ms/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

COPY --from=builder /build/maintenances-ms/dist ./dist
COPY maintenances-ms/prisma ./prisma
COPY maintenances-ms/healthcheck.js ./healthcheck.js

USER node

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node healthcheck.js

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
