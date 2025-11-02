# Multi-target Dockerfile for email-sort
# Targets: web (Next.js app) and worker (background jobs)

# ============================================
# Base stage - Dependencies
# ============================================
FROM node:20-alpine AS base

# Install openssl for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# ============================================
# Build stage - Compile TypeScript & Next.js
# ============================================
FROM base AS builder

WORKDIR /app

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Build worker (compile TypeScript to JavaScript)
RUN npm run build:worker

# ============================================
# Production Web Target
# ============================================
FROM node:20-alpine AS web

# Install openssl for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Next.js build output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start script runs migrations then starts Next.js
CMD ["npm", "run", "start"]

# ============================================
# Production Worker Target
# ============================================
FROM node:20-alpine AS worker

# Install openssl for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled worker code
COPY --from=builder /app/dist ./dist

# Copy source files needed by worker (AI prompts, utilities, etc.)
COPY --from=builder /app/src ./src

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker && \
    chown -R worker:nodejs /app

USER worker

# Worker doesn't expose any ports (connects to Redis/Postgres)

# Start the worker process
CMD ["npm", "run", "start:worker"]
