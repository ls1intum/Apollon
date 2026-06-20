---
id: visual-tests
title: Visual regression tests
description: Regenerating Playwright snapshots inside the pinned Docker image.
---

# Visual regression tests

Apollon's visual regression tests run nightly from `nightly-checks.yml`, not on every PR — they are a rendering guard, not a correctness gate, so they stay out of the per-PR hot path. To run them against a specific branch on demand (e.g. a PR that intentionally changes rendering), use **Actions → Nightly Checks → Run workflow** and pick the branch. They use Playwright with the `mcr.microsoft.com/playwright:v1.59.1-noble` Docker image so snapshots are pinned to one Linux rendering stack regardless of contributor OS.

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

If `visual-regression-tests` fails in `nightly-checks.yml` (nightly, or an on-demand **Run workflow**), download the `playwright-report-visual` artifact from the workflow run, open `playwright-report/index.html` locally, and inspect the actual-vs-expected diff before deciding whether to update the baseline or fix the regression.
