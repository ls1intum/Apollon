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

LABEL org.opencontainers.image.source="https://github.com/ls1intum/Apollon" \
      org.opencontainers.image.url="https://github.com/ls1intum/Apollon" \
      org.opencontainers.image.documentation="https://github.com/ls1intum/Apollon#readme" \
      org.opencontainers.image.title="Apollon Server" \
      org.opencontainers.image.description="Express + Redis + WebSocket relay server for the Apollon UML modeling editor." \
      org.opencontainers.image.vendor="TUM Applied Education Technologies" \
      org.opencontainers.image.licenses="MIT"

# Install tini for proper PID 1 signal handling
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

# Copy runtime artifacts (owned by node user to avoid extra chown layer)
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/standalone/server/package*.json ./standalone/server/
COPY --from=builder --chown=node:node /app/standalone/server/dist ./standalone/server/dist
COPY --from=builder --chown=node:node /app/library/package.json ./library/
COPY --from=builder --chown=node:node /app/library/dist ./library/dist

# Install production dependencies only
RUN npm ci --omit=dev --workspace=@tumaet/server

EXPOSE 8000 4444

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "standalone/server/dist/src/server.js"]
