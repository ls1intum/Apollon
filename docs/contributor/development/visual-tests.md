---
id: visual-tests
title: Visual regression tests
description: Regenerating Playwright snapshots inside the pinned Docker image.
---

# Visual regression tests

Apollon's visual regression tests run on **every PR** as the `visual-regression-tests` job in `pr-health-checks.yml`, feeding the required **PR Health Gate** check. Gating per-PR forces a rendering change to refresh its own baselines in the same PR; running them nightly-only instead lets a rendering change merge green and resurface later as an orphaned failure on an unrelated PR. They use Playwright with the `mcr.microsoft.com/playwright:v1.61.1-noble` Docker image so snapshots are pinned to one Linux rendering stack regardless of contributor OS.

## Regenerating baselines

When an **intentional** UI change makes the job fail, refresh the baselines. They **must** be regenerated inside the same Playwright container CI uses, otherwise CI will diff against macOS/Windows-rendered pixels.

### Preferred: regenerate in CI (no local Docker)

A maintainer runs **Actions → Update Visual Baselines → Run workflow** and enters the PR's branch name. The `update-visual-baselines.yml` workflow regenerates the snapshots inside the pinned container and commits them straight back to the branch. It is `workflow_dispatch`, so it is maintainer-only by construction. For a fork PR, push the branch into this repo (or enable "Allow edits by maintainers") so the workflow can write to it.

### Fallback: regenerate locally in the container

From the repo root:

```sh
docker run --rm -v "$(pwd)":/work -w /work --ipc=host \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c "curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm@11.1.3 \
    && pnpm install --frozen-lockfile \
    && pnpm run build:lib \
    && cd standalone/webapp \
    && pnpm run test:visual:update"
```

## SVG export baselines

SVG export baselines do not depend on the rendering engine — they can be regenerated on any OS:

```sh
cd standalone/webapp
pnpm exec playwright test tests/visual/svg-export --update-snapshots
```

## Triage

If `visual-regression-tests` fails on a PR, download the `playwright-report-visual` artifact from the run, open `playwright-report/index.html` locally, and inspect the actual-vs-expected diff before deciding whether to refresh the baseline (intentional UI change — see above) or fix the regression (unintended).
