# Build stage
  FROM node:20-alpine AS builder
  WORKDIR /app

  # Copy package files
  COPY package*.json ./
  RUN npm ci

  # Copy source (includes .env.production)
  COPY . .

  # Set environment variables for build
  ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
  ENV NEXT_PUBLIC_BESU_RPC_URL=$NEXT_PUBLIC_BESU_RPC_URL
  ENV NEXT_PUBLIC_BESU_WS_URL=$NEXT_PUBLIC_BESU_WS_URL
  ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
  ENV NEXT_PUBLIC_PET_DID_REGISTRY=$NEXT_PUBLIC_PET_DID_REGISTRY
  ENV NEXT_PUBLIC_GUARDIAN_REGISTRY=$NEXT_PUBLIC_GUARDIAN_REGISTRY
  ENV NEXT_PUBLIC_SHELTER_REGISTRY=$NEXT_PUBLIC_SHELTER_REGISTRY
  ENV NEXT_PUBLIC_TOSS_CLIENT_KEY=$NEXT_PUBLIC_TOSS_CLIENT_KEY
  ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  ENV API_BASE_URL_INTERNAL=$API_BASE_URL_INTERNAL
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1

  # Build
  RUN npm run build

  # Runtime stage
  FROM node:20-alpine
  WORKDIR /app

  # Create user and group
  RUN addgroup -g 1001 -S nodejs && \
      adduser -S nextjs -u 1001

  ENV NODE_ENV=production

  # Copy built files with correct ownership
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
  COPY --from=builder --chown=nextjs:nodejs /app/public ./public

  # Create cache directory AFTER copying (이 부분이 핵심!)
  RUN mkdir -p .next/cache && \
      chown -R nextjs:nodejs .next/cache

  # Switch to non-root user
  USER nextjs

  EXPOSE 3000
  CMD ["node", "server.js"]