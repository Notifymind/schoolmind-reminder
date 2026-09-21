# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14 AS bun

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS builder
COPY . .
# Next.js embeds this public value in the browser bundle at build time.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
RUN test -n "$NEXT_PUBLIC_VAPID_PUBLIC_KEY" || \
    (echo "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY as a build argument" >&2; exit 1)
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
