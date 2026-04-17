# Deployments

Deployments are fully automatic on merge to `main`; production promotion is one manual click.

## Flow

| Stage | Trigger | Workflow | Result |
| ----- | ------- | -------- | ------ |
| Staging (auto) | push to `main` | `build-and-push.yml` | Docker images built + tagged `sha-<commit>`, staging deploy fires |
| Release | version change merged to `main` | `release-library.yml`, `release-standalone.yml` | npm publish (if new) + Docker retag to `vX.Y.Z` + cosign sign + GitHub Release |
| Production | Actions → **Deploy to Production** (manual) | `deploy-prod.yml` | prod runs the selected `image-tag` |

See [Releases](npm-publishing.md) for the release-cut procedure.

## Compose files

| File | Purpose | Lifecycle |
| ---- | ------- | --------- |
| `docker/compose.proxy.yml` | Caddy reverse proxy | deployed once; stays up during app deploys |
| `docker/compose.db.yml` | Redis | deployed once; stays up during app deploys |
| `docker/compose.app.yml` | Server + webapp | deployed by CI on every merge + release |

## Run locally in Docker

```sh
docker compose -f ./docker/compose.local.db.yml up -d
docker compose -f ./docker/compose.local.yml up --build
```

The webapp is served at `http://localhost:8080`.
