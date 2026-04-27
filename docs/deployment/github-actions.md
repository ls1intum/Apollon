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
| `docker/compose.proxy.yml` | Traefik reverse proxy + maintenance page | deployed once; stays up during app deploys |
| `docker/compose.db.yml` | Redis | deployed once; stays up during app deploys |
| `docker/compose.app.yml` | Server + webapp | deployed by CI on every merge + release |

## Required environment variables

Set per GitHub Environment. Values are deployment-specific; names are fixed.

| Var | Purpose | Example |
| --- | --- | --- |
| `APP_HOSTNAME` | Single public hostname the reverse proxy serves and that Let's Encrypt issues a certificate for. | `apollon.aet.cit.tum.de` |
| `ACME_EMAIL` | Registration email for Let's Encrypt. | `admin@tum.de` |
| `VM_HOST` | SSH target the deploy workflow connects to. May differ from `APP_HOSTNAME`. | `apollon-prod.aet.cit.tum.de` |
| `VM_USERNAME` | SSH user on the VM. | `github_deployment` |
| `VM_SSH_PRIVATE_KEY` | SSH key (secret). | — |

### Optional environment variables

| Var | Purpose | Example |
| --- | --- | --- |
| `APP_HOSTNAME_ALIASES_RULE` | Traefik matcher listing additional hostnames that should permanently 301-redirect to `APP_HOSTNAME`. Each listed hostname also receives its own Let's Encrypt certificate so HTTPS bookmarks redirect cleanly. Leave unset on environments without aliases. | `` Host(`apollon-prod.aet.cit.tum.de`, `apollon.ase.cit.tum.de`, `apollon.ase.in.tum.de`) `` |

## Run locally in Docker

```sh
docker compose -f ./docker/compose.local.db.yml up -d
docker compose -f ./docker/compose.local.yml up --build
```

The webapp is served at `http://localhost:8080`.
