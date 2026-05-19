# Release-notes style guide

Apollon ships three independent release lines (`@tumaet/apollon` on npm, the standalone webapp + server on `ghcr.io`, the VS Code extension on Marketplace and Open VSX), all driven by [Changesets](https://github.com/changesets/changesets). This guide is the contract for what each PR author writes so good release notes happen automatically.

## What you write per PR

```sh
npm run changeset
```

The CLI asks which packages bump, the bump type, and a summary. **The summary is the changelog entry, verbatim.** Edit `.changeset/<name>.md` after the CLI exits — the prompt is too short for good prose — and commit it with your PR.

If your PR is docs-only, CI-only, or otherwise doesn't change a published or operator-visible workspace, skip the step.

## Two rules for the summary

**Write for the user, not the engineer.** Lead with what the user can now do (or, for fixes, the symptom they would have seen). Implementation language — internal types, hook names, file paths — stays in the PR description.

| Don't | Do |
| --- | --- |
| `feat: add useExportAsPPTX hook with lazy-loaded pptxgenjs` | `Export diagrams as animatable PowerPoint slides.` |
| `Reset isLoading=true on effect re-entry and thread AbortController.signal` | `Sharing a diagram twice no longer leaves a blank canvas behind.` |
| `Refactor preview-mode lifecycle` | `editor.setPreviewMode(boolean) decouples the canvas from the Yjs doc.` *(library track names the symbol — that's the user surface there)* |

**Breaking changes call out the migration.** Mark the changeset `major` and link a runbook (typically [`docs/admin/operations.md`](../admin/operations.md)) in the summary. Don't bury the migration steps in the PR body.

## Per-package conventions

| Package | Audience | Voice |
| --- | --- | --- |
| `@tumaet/apollon` | embedders | name the API; describe the contract |
| `@tumaet/webapp` + `@tumaet/server` (lockstep) | end users + operators | what the user can do; for operators, link the runbook |
| `apollon-vscode` | extension users | what the user can do |

The webapp and server are `fixed` in [`.changeset/config.json`](../../.changeset/config.json) — a changeset on one bumps both. A library minor auto-patches webapp + server via `updateInternalDependencies: patch`.

## Picking the bump type

- **patch** — bug fixes, internal-only changes that consumers can opt into without code changes.
- **minor** — new functionality that is backwards-compatible (new options, new exports, new optional behaviour).
- **major** — anything that breaks an existing caller, deployment, or storage layout. A `major` changeset must link a migration runbook (typically [`docs/admin/operations.md`](../admin/operations.md)).

## Worked examples

A standalone-only fix (`#683` from v4.4.1):

```markdown
---
"@tumaet/webapp": patch
---

Sharing a diagram a second time, or starting a new diagram during a collaboration session, no longer leaves a blank canvas behind.
```

A library API addition (`#657` from v4.4.0):

```markdown
---
"@tumaet/apollon": minor
---

Adds `setPreviewMode`, `setReadonly`, `fitView`, and `broadcastFullState` to the editor for hosts building a version-history UX on top of the live Yjs document.
```

A change that spans webapp and library lands as two changesets in the same PR — one per audience, each in its track's voice.

## What `CHANGELOG.md` files look like

`CHANGELOG.md` is the per-version bullet log Changesets writes; the **GitHub Release body** is where a maintainer adds a one-paragraph lede and any `### Highlights` with screenshots before the release tag is cut. Editing the Release body is the only human-curation step per release.

CI enforces this shape — every bullet must begin with `[#NNN](pr-url)`, `` [`shortsha`](commit-url) ``, or the `Released in lockstep` sentinel. See [`scripts/check-release-docs.mjs`](../../scripts/check-release-docs.mjs), wired into [`.github/workflows/verify-changesets.yml`](../../.github/workflows/verify-changesets.yml).

## See also

- [`AGENTS.md`](../../AGENTS.md) — the contract for agent contributors
- [`docs/contributing.md`](../contributing.md) — the contribution flow

## References

- [Changesets `@changesets/cli@2.27.11`](https://github.com/changesets/changesets/tree/%40changesets/cli%402.27.11) — the release-pipeline tool we adopted.
- [Changesets config schema `@changesets/config@3.1.4`](https://unpkg.com/@changesets/config@3.1.4/schema.json) — pinned in [`.changeset/config.json`](../../.changeset/config.json).
- [`@changesets/changelog-github@0.5.1`](https://github.com/changesets/changesets/blob/main/packages/changelog-github/README.md) — the renderer that emits per-PR bullets with commit + author links.
- [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) — informs the spirit of the per-package bullet log. We do not follow the literal section names (`Added` / `Changed` / `Removed`); Changesets emits `Major / Minor / Patch Changes` instead, grouped by bump type.
- [vercel/ai's release pipeline](https://github.com/vercel/ai/tree/main/.changeset) — the working reference for a multi-package Changesets monorepo with lockstep version groups.
