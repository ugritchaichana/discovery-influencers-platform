# syntax=docker/dockerfile:1.7
FROM node:20.18.0-bullseye-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "dev"]

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY package.json pnpm-lock.yaml .npmrc ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
RUN pnpm install --frozen-lockfile --prod
CMD ["pnpm", "start"]
