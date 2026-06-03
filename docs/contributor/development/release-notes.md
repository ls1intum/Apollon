---
id: release-notes
title: Release notes
description: How to write the changeset that becomes a changelog entry — voice, bump type, worked examples.
---

# Release-notes style guide

User-facing release notes come from [Changesets](https://github.com/changesets/changesets). One changeset per user-visible PR; its summary becomes the changelog entry verbatim.

Three release lines carry changesets: `@tumaet/apollon` on npm, and `@tumaet/webapp` + `@tumaet/server` as paired `ghcr.io` Docker images. The VS Code extension, the docs site, and the webview sub-packages are excluded in `.changeset/config.json#ignore` — they have their own (or no) release flow, and without the exclusion a routine library bump would version them too, since every package depends on `@tumaet/apollon` via `workspace:*`.

:::note
Changesets are adopted as the per-PR convention now. The pipeline that consumes them (`changeset version` → `CHANGELOG.md` → release) is a follow-up; until it lands, write the changeset so the backlog is ready. See [Releases](/contributor/deployment/npm-publishing).
:::

## What you write per PR

```sh
pnpm changeset
```

The CLI asks which packages bump, the bump type, and a summary. **The summary is the changelog entry, verbatim.** Edit `.changeset/<name>.md` after the CLI exits and commit it with your PR. Skip on docs-only, CI-only, or pure-refactor PRs.

## Writing the summary

**Write for the user, not the engineer.** Lead with what the user can now do (or, for fixes, the symptom they would have seen). Implementation language — internal types, hook names, file paths — stays in the PR description.

| Don't                                                           | Do                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `add useExportAsPPTX hook with lazy-loaded pptxgenjs`           | `Export diagrams as animatable PowerPoint slides.`                |
| `Reset isLoading on effect re-entry and thread AbortController` | `Sharing a diagram twice no longer leaves a blank canvas behind.` |
| `Refactor preview-mode lifecycle`                               | `setPreviewMode decouples the canvas from the Yjs doc.`           |

For **breaking changes**, mark the changeset `major` and link a migration runbook (typically [`ops/operations.md`](https://github.com/ls1intum/Apollon/blob/main/ops/operations.md)).

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

`CHANGELOG.md` is the per-version bullet log Changesets writes; humans don't edit it by hand. The **GitHub Release body** carries the human-curated lede and highlights (screenshots, video).

You write only the changeset body (the markdown after the frontmatter). At `changeset version` time, `@changesets/changelog-github` prepends the PR link, commit link, and `Thanks @author!` automatically. The backfilled v4.4.0 / v4.4.1 entries omit the commit-SHA link — those commits predate Changesets; new releases include it.
