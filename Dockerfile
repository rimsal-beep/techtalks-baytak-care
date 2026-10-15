

FROM node:24-alpine AS base

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use a temporary URL only during the build.
# This does not connect to a real database.
RUN DATABASE_URL="postgresql://baytak:build_only@localhost:5432/baytak_care" npx prisma generate

RUN DATABASE_URL="postgresql://baytak:build_only@localhost:5432/baytak_care" npm run build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
