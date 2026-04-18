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

Set per GitHub Environment (Production / Staging). None of these are code-specific — third-party deployers replace the values, not the names.

| Var | Purpose |
| --- | --- |
| `APP_HOSTNAME` | Public hostname the reverse proxy serves (Traefik `Host()` matcher, Let's Encrypt SAN). |
| `ACME_EMAIL` | Registration email for Let's Encrypt. |
| `VM_HOST` | SSH target the deploy workflow connects to. |
| `VM_USERNAME` | SSH user on the VM. |
| `VM_SSH_PRIVATE_KEY` | SSH key (secret, not variable). |

## Hostname cutover procedure

When moving the public hostname to a new VM (e.g., migrating from one host to another while the old one still holds the name):

1. **Pre-cutover** — deploy to the new VM using a temporary `APP_HOSTNAME` (e.g., a VM-specific subdomain that resolves to the new box). Verify end-to-end including `/api` and `/ws`.
2. **Lower DNS TTL** on the target hostname to 60–300 s, a day or more in advance, so propagation is fast.
3. **Cutover window** (~2 min downtime):
   1. Stop the old VM's proxy stack so it releases the hostname.
   2. Flip the DNS record to the new VM's IP.
   3. Change `APP_HOSTNAME` in the GitHub Environment to the target hostname.
   4. Run **Deploy to Production** (or Staging) with `deploy-proxy: true`. Traefik requests a Let's Encrypt cert via HTTP-01 on the first request after the flip (~10 s).
4. **After settling** — remove the temporary hostname from DNS or keep it as a redirect. `VM_HOST` can continue pointing at the VM-specific name for SSH; it is independent of `APP_HOSTNAME`.

Let's Encrypt rate limits (50 certs/week per registered domain, 5 duplicate certs/week) make this safe to repeat a handful of times; don't loop it.

## Run locally in Docker

```sh
docker compose -f ./docker/compose.local.db.yml up -d
docker compose -f ./docker/compose.local.yml up --build
```

The webapp is served at `http://localhost:8080`.
