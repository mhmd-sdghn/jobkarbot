# Stage 1 — build TypeScript
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2 — production runtime with Playwright/Chromium
FROM node:20-slim AS runner
WORKDIR /app

RUN npm install -g npm@latest

COPY package*.json ./
RUN npm ci --omit=dev

# Install Chromium and all required system dependencies
RUN npx playwright install --with-deps chromium

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3658
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 3658

CMD ["node", "dist/index.js"]
