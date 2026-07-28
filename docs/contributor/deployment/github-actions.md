---
id: github-actions
title: Deployments
description: Automatic deployments on merge to main; one-click production promotion.
---

# Deployments

Deployments are fully automatic on merge to `main`; production promotion is one manual click.

## Flow

| Stage          | Trigger                                     | Workflow                                                                        | Result                                                                                      |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Staging (auto) | successful Docker build on `main`           | `deploy-staging-after-build.yml` → `deploy-staging.yml`                         | The matching `sha-<commit>` images deploy to staging                                        |
| Docs (auto)    | push to `main`                              | `docs.yml`                                                                      | Docusaurus site rebuilt and published to GitHub Pages                                       |
| Release        | version change merged to `main`             | `release-library.yml`, `release-standalone.yml`, `release-vscode-extension.yml` | npm / VS Code Marketplace publish + Docker retag to `vX.Y.Z` + cosign sign + GitHub Release |
| TestFlight     | successful new standalone `vX.Y.Z` release  | `ios-testflight-release.yml`                                                    | Matching signed iOS build uploads once to TestFlight                                        |
| Production     | Actions → **Deploy to Production** (manual) | `deploy-prod.yml`                                                               | prod runs the selected `image-tag`                                                          |

`version-monotonicity.yml` guards every PR by failing if a workspace
`package.json` version moves backwards.

Docker image publication, staging deployment, and standalone release are separate
downstream workflows. A staging infrastructure outage therefore remains visible as
a failed deployment without turning a successful image build red or suppressing a
release. If a standalone release is interrupted after its images were built, run
**Release Standalone** manually with that build's commit SHA; its retag, signing,
tagging, and GitHub Release steps are safe to resume.

`ios-testflight-release.yml` follows a successful standalone release and uploads
the same version to TestFlight. It records `ios-testflight@X.Y.Z` only after the
upload succeeds, making retries idempotent. Its manual App Store destinations
upload metadata and screenshots, then reuse the exact processed TestFlight build
number when submission is requested; they never rebuild an untested binary.
Submission and review remain explicit because they include human and legal
checks.

`pr-health-checks.yml` runs the full per-PR matrix, including the visual-regression
guard (pinned Playwright container) feeding the required **PR Health Gate** check.
`update-visual-baselines.yml` (manual **Run workflow** against a branch) regenerates
screenshot baselines in that same container and commits them back — used when an
intentional UI change needs fresh baselines.

See [Releases](npm-publishing) for the release-cut procedure.

## Compose files

| File                          | Purpose                                  | Lifecycle                                  |
| ----------------------------- | ---------------------------------------- | ------------------------------------------ |
| `docker/compose.proxy.yml`    | Traefik reverse proxy + maintenance page | deployed once; stays up during app deploys |
| `docker/compose.db.yml`       | Redis                                    | deployed once; stays up during app deploys |
| `docker/compose.app.yml`      | Server + webapp                          | deployed by CI on every merge + release    |
| `docker/compose.local.db.yml` | Redis for local development              | started by `pnpm dev` / locally on demand  |
| `docker/compose.local.yml`    | Local server + webapp stack              | optional; for `docker compose`-based dev   |

## Required environment variables

Set per GitHub Environment. Values are deployment-specific; names are fixed.

| Var                  | Purpose                                                                                                                     | Example                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `APP_HOSTNAME`       | Single public hostname the reverse proxy serves and that Let's Encrypt issues a certificate for.                            | `apollon.aet.cit.tum.de`      |
| `ACME_EMAIL`         | Registration email for Let's Encrypt.                                                                                       | `admin@tum.de`                |
| `VM_HOST`            | SSH target the deploy workflow connects to. May differ from `APP_HOSTNAME`.                                                 | `apollon-prod.aet.cit.tum.de` |
| `VM_USERNAME`        | SSH user on the VM.                                                                                                         | `github_deployment`           |
| `VM_SSH_PRIVATE_KEY` | SSH key (secret).                                                                                                           | —                             |
| `OWNER_SECRET`       | HMAC secret for the soft-ownership cookie. Required (`compose.app.yml` fails closed if unset). Rotate per `ops/runbook.md`. | random 32-byte hex            |

### Optional environment variables

| Var                         | Purpose                                                                                                                                                                                                                                                                                                                                                 | Example                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `APP_HOSTNAME_ALIASES_RULE` | Traefik matcher listing additional hostnames that should permanently 301-redirect to `APP_HOSTNAME`. Each listed hostname also receives its own Let's Encrypt certificate so HTTPS bookmarks redirect cleanly. Combine multiple hosts with `\|\|` — Traefik v3's `Host()` matcher takes a single argument. Leave unset on environments without aliases. | ``Host(`apollon-prod.aet.cit.tum.de`) \|\| Host(`apollon.ase.cit.tum.de`) \|\| Host(`apollon.ase.in.tum.de`)`` |
| `LEGAL_PROFILE`             | Selects a bundled legal-pages profile (e.g., `tumaet`). Leave unset for a generic deployment showing the red disclaimer banner. See `ops/legal-pages.md`.                                                                                                                                                                                               | `tumaet`                                                                                                       |

## Run locally in Docker

```sh
docker compose -f ./docker/compose.local.db.yml up -d
docker compose -f ./docker/compose.local.yml up --build
```

The webapp is served at `http://localhost:8080`.
