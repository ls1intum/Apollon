---
id: release-notes
title: Release notes
description: How to write the changeset that becomes a changelog entry — voice, bump type, worked examples.
---

# Release-notes style guide

User-facing release notes come from [Changesets](https://github.com/changesets/changesets). One changeset per user-visible PR; its summary becomes the changelog entry verbatim.

Three release lines carry changesets: `@tumaet/apollon` on npm, and `@tumaet/webapp` + `@tumaet/server` as paired `ghcr.io` Docker images. The VS Code extension, the docs site, and the webview sub-packages are excluded in `.changeset/config.json#ignore` — they have their own (or no) release flow, and without the exclusion a routine library bump would version them too, since every package depends on `@tumaet/apollon` via `workspace:*`.

:::note
Changesets are the per-PR convention now; the pipeline that consumes them (`changeset version` → `CHANGELOG.md` → release) lands in a follow-up. Until then, write the changeset so the backlog is ready — and note that the existing `CHANGELOG.md` files are hand-maintained, since the tool does not yet regenerate them. See [Releases](/contributor/deployment/npm-publishing).
:::

## When do you need one?

Add a changeset whenever a **user, embedder, or operator would notice** a change to `@tumaet/apollon`, `@tumaet/webapp`, or `@tumaet/server` — a new feature, a bug fix, a changed API, or a new deployment step.

Skip it when nothing downstream is affected: docs, CI, tests, refactors, and formatting — plus anything touching only the VS Code extension or the docs site (both excluded above). When unsure, add one; an extra changelog line beats a silent gap. The advisory **Verify changesets** check on each PR reminds you.

## What you write per PR

```sh
pnpm changeset
```

Pick the packages and bump type when prompted; **the summary you type becomes the changelog entry, verbatim.** Edit `.changeset/<name>.md` afterwards and commit it with your PR.

## Writing the summary

**Write for the user, not the engineer.** Lead with what the user can now do (or, for fixes, the symptom they would have seen). Implementation language — internal types, hook names, file paths — stays in the PR description.

| Don't                                                           | Do                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `add useExportAsPPTX hook with lazy-loaded pptxgenjs`           | `Export diagrams as animatable PowerPoint slides.`                |
| `Reset isLoading on effect re-entry and thread AbortController` | `Sharing a diagram twice no longer leaves a blank canvas behind.` |

For an embedder-facing library change, name the API and describe the contract instead — see [Per-package conventions](#per-package-conventions) below.

For **breaking changes**, mark the changeset `major` and link a migration runbook — the GitHub Release body, or [`ops/operations.md`](https://github.com/ls1intum/Apollon/blob/main/ops/operations.md).

## Per-package conventions

| Package                                      | Audience              | Voice                                                 |
| -------------------------------------------- | --------------------- | ----------------------------------------------------- |
| `@tumaet/apollon`                            | embedders             | name the API; describe the contract                   |
| `@tumaet/webapp` + `@tumaet/server` (paired) | end users + operators | what the user can do; for operators, link the runbook |

## Picking the bump type

- **patch** — bug fixes, internal-only changes consumers adopt without code changes.
- **minor** — new backwards-compatible functionality (new options, exports, optional behaviour).
- **major** — breaks an existing caller, deployment, or storage layout. Must link a migration runbook.

## Worked examples

A standalone-only fix (`#683`, in v4.4.1):

```markdown
---
"@tumaet/webapp": patch
---

Sharing a diagram a second time, or starting a new diagram during a collaboration session, no longer leaves a blank canvas behind.
```

A library API addition (`#657`, in v4.4.0):

```markdown
---
"@tumaet/apollon": minor
---

Adds editor primitives for hosting a version-history UX on top of the live Yjs document — preview mode, programmatic readonly, fit-to-view, and full-state broadcast.
```

A change that spans the webapp and the library lands as two changesets in the same PR — one per audience, each in its track's voice.

## CHANGELOG.md and the GitHub Release body

`CHANGELOG.md` is the per-version bullet log Changesets writes; once the consuming pipeline lands it is tool-owned, not edited by hand. The **GitHub Release body** carries the human-curated lede and highlights (screenshots, video).

You write only the changeset body (the markdown after the frontmatter). At `changeset version` time, `@changesets/changelog-github` prepends the PR link, commit link, and `Thanks @author!` automatically. The backfilled v4.4.0 / v4.4.1 entries omit the commit-SHA link — those commits predate Changesets; new releases include it.
