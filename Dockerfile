# Stage 1 — build TypeScript
FROM node:20-slim AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# Stage 2 — production runtime with Playwright/Chromium
FROM node:20-slim AS runner
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Install Chromium, system dependencies, and procps (needed by Crawlee memory monitor)
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*
RUN npx playwright install --with-deps chromium

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3658
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 3658

CMD ["node", "dist/index.js"]
