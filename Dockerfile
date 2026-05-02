# Stage 1 — build TypeScript
FROM mirror2.chabokan.net/node:24-slim AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# Stage 2 — production runtime with Playwright/Chromium
FROM mirror2.chabokan.net/node:24-slim AS runner

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production
ENV PORT=3658

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod



# apt mirror
RUN rm -f /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources \
    && printf '\
deb http://mirror.shatel.ir/debian trixie main contrib non-free non-free-firmware\n\
' > /etc/apt/sources.list

# Install Chromium, system dependencies, and procps (needed by Crawlee memory monitor)
RUN apt-get -o Acquire::Check-Valid-Until=false update \
    && apt-get install -y --no-install-recommends \
    procps \
    && rm -rf /var/lib/apt/lists/*

RUN pnpm dlx playwright install --with-deps chromium

COPY --from=builder /app/dist ./dist

EXPOSE 3658

CMD ["node", "dist/index.js"]
