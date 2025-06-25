# AI Services - LLM, Mental Arena, Emotions
FROM node:22-slim AS base

# Install system dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
ARG PNPM_VERSION=10.12.3
RUN npm install -g pnpm@$PNPM_VERSION

WORKDIR /app

# Create Python virtual environment for ML models
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python ML dependencies
RUN pip install --no-cache-dir \
    torch \
    transformers \
    sentence-transformers \
    openai \
    anthropic \
    numpy \
    scipy

# Build stage
FROM base AS build

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy AI services source code
COPY src/lib/ai ./src/lib/ai
COPY src/types ./src/types
COPY ai ./ai
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm tsc --project tsconfig.json --outDir dist

# Production stage
FROM base AS production

RUN addgroup --system --gid 1001 aiservice && \
    adduser --system --uid 1001 aiservice

# Copy built application
COPY --from=build --chown=aiservice:aiservice /app/dist ./dist
COPY --from=build --chown=aiservice:aiservice /app/node_modules ./node_modules
COPY --from=build --chown=aiservice:aiservice /app/ai ./ai

USER aiservice

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

CMD ["node", "dist/lib/ai/services/server.js"]
