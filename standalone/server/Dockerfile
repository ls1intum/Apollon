# syntax=docker/dockerfile:1.9

ARG NODE_IMAGE=node:24.15.0-slim@sha256:24dc26ef1e3c3690f27ebc4136c9c186c3133b25563ae4d7f0692e4d1fe5db0e

# DL3006 wants `FROM image:tag`, but the ARG default above is fully
# digest-pinned (stronger than tag pinning). The ARG indirection lets CI
# override the base image for vulnerability scans without editing the file.
# hadolint ignore=DL3006
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# pnpm installed via npm, not corepack; corepack disabled so it cannot shadow.
RUN corepack disable && npm install -g pnpm@11.1.3 \
    && pnpm config set store-dir /pnpm/store
WORKDIR /app

FROM base AS builder

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY library/package.json ./library/
# The library depends on the @tumaet/ui workspace package (build-time, bundled
# into its dist) — needed for the library build below to resolve and for
# `pnpm deploy` to walk the library's dependency tree.
COPY packages/ui/package.json ./packages/ui/
COPY standalone/server/package.json ./standalone/server/
COPY standalone/webapp/package.json ./standalone/webapp/
COPY vscode-extension/package.json ./vscode-extension/
COPY vscode-extension/menu/package.json ./vscode-extension/menu/
COPY vscode-extension/editor/package.json ./vscode-extension/editor/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY library ./library
COPY packages/ui ./packages/ui
COPY standalone/server ./standalone/server
COPY tsconfig*.json ./

RUN pnpm --filter @tumaet/apollon run build
RUN pnpm --filter @tumaet/server run build

FROM base AS deploy
# Only the trees `pnpm deploy --filter=@tumaet/server` walks — skip webapp / vscode.
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=builder /app/library ./library
# library declares @tumaet/ui as a dependency, so `pnpm deploy` walks it; its
# files must be present (the copied node_modules links into here).
COPY --from=builder /app/packages/ui ./packages/ui
COPY --from=builder /app/standalone/server ./standalone/server
COPY --from=builder /app/node_modules ./node_modules
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm deploy --filter=@tumaet/server --prod /deploy/server

# hadolint ignore=DL3006
FROM ${NODE_IMAGE} AS runtime

WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/ls1intum/Apollon" \
      org.opencontainers.image.url="https://github.com/ls1intum/Apollon" \
      org.opencontainers.image.documentation="https://github.com/ls1intum/Apollon#readme" \
      org.opencontainers.image.title="Apollon Server" \
      org.opencontainers.image.description="Express + Redis + WebSocket relay server for the Apollon UML modeling editor." \
      org.opencontainers.image.vendor="TUM Applied Education Technologies" \
      org.opencontainers.image.licenses="MIT"

RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

COPY --from=deploy --chown=node:node /deploy/server ./

EXPOSE 8000 4444

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/src/server.js"]
