# bookworm (glibc) works reliably with better-sqlite3 prebuilt binaries.
FROM node:22-bookworm-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && \
  mkdir -p .next/standalone/node_modules/better-sqlite3 && \
  cp -r node_modules/better-sqlite3/build .next/standalone/node_modules/better-sqlite3/

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN mkdir -p /app/data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Run as root so a Fly.io volume mounted at /app/data stays writable.
CMD ["sh", "-c", "mkdir -p /app/data && exec node server.js"]
