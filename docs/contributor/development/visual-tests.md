---
id: visual-tests
title: Visual regression tests
description: Regenerating Playwright snapshots inside the pinned Docker image.
---

# Visual regression tests

Apollon's visual regression tests run as part of `pr-health-checks.yml` on every PR. They use Playwright with the `mcr.microsoft.com/playwright:v1.59.1-noble` Docker image so snapshots are pinned to one Linux rendering stack regardless of contributor OS.

## Regenerating baselines

Snapshots **must** be regenerated inside the same Playwright container CI uses, otherwise CI will diff against macOS/Windows-rendered pixels. From the repo root:

```sh
docker run --rm -v "$(pwd)":/work -w /work --ipc=host \
  mcr.microsoft.com/playwright:v1.59.1-noble \
  bash -c "curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm@11.1.3 \
    && pnpm install --frozen-lockfile \
    && pnpm run build:lib \
    && cd standalone/webapp \
    && pnpm exec playwright test tests/visual/ --update-snapshots"
```

## SVG export baselines

SVG export baselines do not depend on the rendering engine — they can be regenerated on any OS:

```sh
cd standalone/webapp
pnpm exec playwright test tests/visual/svg-export --update-snapshots
```

## Triage

If `visual-regression-tests` fails on CI, download the `playwright-report-visual` artifact from the workflow run, open `playwright-report/index.html` locally, and inspect the actual-vs-expected diff before deciding whether to update the baseline or fix the regression.
