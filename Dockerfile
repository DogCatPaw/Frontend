# Multi-stage build for Next.js 15

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_BESU_RPC_URL
ARG NEXT_PUBLIC_BESU_WS_URL
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_PET_DID_REGISTRY
ARG NEXT_PUBLIC_GUARDIAN_REGISTRY
ARG NEXT_PUBLIC_SHELTER_REGISTRY
ARG NEXT_PUBLIC_TOSS_CLIENT_KEY
ARG TOSS_SECRET_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_BESU_RPC_URL=$NEXT_PUBLIC_BESU_RPC_URL
ENV NEXT_PUBLIC_BESU_WS_URL=$NEXT_PUBLIC_BESU_WS_URL
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_PET_DID_REGISTRY=$NEXT_PUBLIC_PET_DID_REGISTRY
ENV NEXT_PUBLIC_GUARDIAN_REGISTRY=$NEXT_PUBLIC_GUARDIAN_REGISTRY
ENV NEXT_PUBLIC_SHELTER_REGISTRY=$NEXT_PUBLIC_SHELTER_REGISTRY
ENV NEXT_PUBLIC_TOSS_CLIENT_KEY=$NEXT_PUBLIC_TOSS_CLIENT_KEY
ENV TOSS_SECRET_KEY=$TOSS_SECRET_KEY

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application (standalone output)
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
