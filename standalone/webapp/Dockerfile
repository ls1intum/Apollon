# syntax=docker/dockerfile:1.27@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e

ARG NODE_IMAGE=node:24.21.0-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

# DL3006 wants `FROM image:tag`, but the ARG default above is fully
# digest-pinned (stronger than tag pinning). The ARG indirection lets CI
# override the base image for vulnerability scans without editing the file.
# hadolint ignore=DL3006
FROM ${NODE_IMAGE} AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# pnpm installed via npm, not corepack; corepack disabled so it cannot shadow.
RUN corepack disable && npm install -g pnpm@12.8.1 \
    && pnpm config set store-dir /pnpm/store
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY library/package.json ./library/
# The library depends on the @tumaet/ui workspace package; without its manifest
# pnpm can't link it and `pnpm --filter @tumaet/ui run build:*` no-ops, so the
# library's tsc -b fails to resolve @tumaet/ui/components/*.
COPY packages/ui/package.json ./packages/ui/
COPY standalone/webapp/package.json ./standalone/webapp/

# `<pkg>...` selects the webapp plus the workspaces it depends on, so the only
# manifests this stage needs are the ones copied above.
#
# `--ignore-scripts` keeps the stage hermetic. Every dependency lifecycle script
# reachable from here either downloads a binary over the network (sharp, pulled
# in by @capacitor/assets for mobile icon generation) or compiles C++ against a
# toolchain this slim image deliberately omits (cpu-features). Nothing the
# webapp bundle is built from needs either, and a script that reaches the
# network turns an image build into a coin flip on GitHub Releases being up.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter @tumaet/webapp...

COPY library ./library
COPY packages/ui ./packages/ui
COPY standalone/webapp ./standalone/webapp
COPY tsconfig*.json ./

# The webapp's `tsc -b` resolves `@tumaet/apollon` via the workspace link
# in node_modules (injected by pnpm), which requires the library's compiled
# .d.ts in dist/. Build the library first.
RUN pnpm --filter @tumaet/apollon run build \
 && pnpm --filter @tumaet/webapp run build

FROM nginx:1.31-alpine@sha256:df221db836e1754089190208cee7eeda94f233197056426eda74a43ab1abeac2 AS runtime

LABEL org.opencontainers.image.source="https://github.com/ls1intum/Apollon" \
      org.opencontainers.image.url="https://github.com/ls1intum/Apollon" \
      org.opencontainers.image.documentation="https://github.com/ls1intum/Apollon#readme" \
      org.opencontainers.image.title="Apollon Webapp" \
      org.opencontainers.image.description="Browser-hosted web app for the Apollon UML modeling editor." \
      org.opencontainers.image.vendor="TUM Applied Education Technologies" \
      org.opencontainers.image.licenses="MIT"

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/standalone/webapp/dist /usr/share/nginx/html
COPY standalone/webapp/docker/entrypoint.sh /docker-entrypoint.d/40-apollon-env.sh

RUN chmod +x /docker-entrypoint.d/40-apollon-env.sh && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

USER nginx

CMD ["nginx", "-g", "daemon off;"]
