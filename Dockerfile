# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json* npm-shrinkwrap.json* pnpm-lock.yaml* yarn.lock* ./
RUN set -eux; \
    if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then corepack enable yarn && yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; \
    else npm install; \
    fi

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./
COPY next.config.ts ./next.config.ts
CMD ["npm", "run", "start"]
