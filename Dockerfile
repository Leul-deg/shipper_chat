# syntax=docker/dockerfile:1

# ================================
# Base stage
# ================================
FROM node:20-alpine AS base

# Install dependencies for Prisma and native modules
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ================================
# Dependencies stage
# ================================
FROM base AS deps

COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci

# ================================
# Builder stage
# ================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ================================
# Production stage
# ================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install production deps + tsx for running TypeScript server
RUN npm ci --only=production && npm install tsx

# Copy Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built Next.js
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy server and lib (TypeScript files)
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types

# Copy configs
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

RUN chown -R nextjs:nodejs /app

USER nextjs

# Single port for both HTTP and WebSocket
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run with tsx for TypeScript support
CMD ["npx", "tsx", "server.ts"]
