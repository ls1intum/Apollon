FROM node:22.14.0-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY standalone/server/package*.json ./standalone/server/
COPY library/package*.json ./library/

RUN npm ci

COPY standalone/server ./standalone/server
COPY library ./library

RUN npm run build:lib && npm run build:server

FROM node:22.14.0-slim AS runtime

WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/ls1intum/Apollon2" \
      org.opencontainers.image.title="apollon2-server"

# Install tini for proper PID 1 signal handling
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

# Copy runtime artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/standalone/server/package*.json ./standalone/server/
COPY --from=builder /app/standalone/server/dist ./standalone/server/dist
COPY --from=builder /app/library/package.json ./library/
COPY --from=builder /app/library/dist ./library/dist

# Install production dependencies only
RUN npm ci --omit=dev --workspace=@tumaet/server && \
    chown -R node:node /app

EXPOSE 8000 4444

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "standalone/server/dist/src/server.js"]
