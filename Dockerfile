# ==============================================================================
# Stage 1: Build Frontend (React + Vite + Tailwind CSS)
# ==============================================================================
FROM node:20-alpine AS client-builder
WORKDIR /build/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production SCM Runtime with Fossil Engine
# ==============================================================================
FROM node:20-bookworm-slim AS runner

# Install Fossil SCM and curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    fossil \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Copy server package manifests and install production dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server application source
COPY server/src ./src

# Copy built frontend assets from client-builder stage
COPY --from=client-builder /build/client/dist /app/client/dist

# Create persistent storage directories for Fossil repositories and SQLite DB
RUN mkdir -p /app/server/data/repositories /app/server/data/workspaces

# Environment Configuration
ENV PORT=5000
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/server/data/scm_metadata.sqlite
ENV FOSSIL_PATH=/usr/bin/fossil
ENV FOSSIL_DATA_DIR=/app/server/data
ENV DOCKER_CONTAINER=true

# Persistent volume mount for Fossil repositories and SQLite database
VOLUME ["/app/server/data"]

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application server
CMD ["node", "src/server.js"]
