# Release-notes style guide

[Changesets](https://github.com/changesets/changesets) drives the changelog for two release lines today: `@tumaet/apollon` on npm and `@tumaet/webapp` + `@tumaet/server` as paired `ghcr.io` Docker images. `apollon-vscode` ships on the VS Marketplace via a separate release flow.

## What you write per PR

```sh
npm run changeset
```

The CLI asks which packages bump, the bump type, and a summary. **The summary is the changelog entry, verbatim.** Edit `.changeset/<name>.md` after the CLI exits and commit it with your PR. Skip on docs-only, CI-only, or pure-refactor PRs.

## Writing the summary

**Write for the user, not the engineer.** Lead with what the user can now do (or, for fixes, the symptom they would have seen). Implementation language — internal types, hook names, file paths — stays in the PR description.

| Don't | Do |
| --- | --- |
| `feat: add useExportAsPPTX hook with lazy-loaded pptxgenjs` | `Export diagrams as animatable PowerPoint slides.` |
| `Reset isLoading=true on effect re-entry and thread AbortController.signal` | `Sharing a diagram twice no longer leaves a blank canvas behind.` |
| `Refactor preview-mode lifecycle` | `editor.setPreviewMode(boolean) decouples the canvas from the Yjs doc.` |

For **breaking changes**, mark the changeset `major` and link a migration runbook (typically [`docs/admin/operations.md`](../admin/operations.md)).

## Per-package conventions

| Package | Audience | Voice |
| --- | --- | --- |
| `@tumaet/apollon` | embedders | name the API; describe the contract |
| `@tumaet/webapp` + `@tumaet/server` (paired) | end users + operators | what the user can do; for operators, link the runbook |

## Picking the bump type

- **patch** — bug fixes, internal-only changes that consumers can opt into without code changes.
- **minor** — new functionality that is backwards-compatible (new options, new exports, new optional behaviour).
- **major** — breaks an existing caller, deployment, or storage layout. Must link a migration runbook.

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

## CHANGELOG.md and the GitHub Release body

`CHANGELOG.md` is the per-version bullet log Changesets writes; humans don't edit it by hand. The **GitHub Release body** carries the human-curated lede + `### Highlights` (screenshots, video) for the release.

You write only the changeset body (the markdown after the frontmatter). At `changeset version` time, `@changesets/changelog-github` prepends `- [#PR](url) [`<sha>`](url) Thanks [@user](url)! - ` automatically. The backfilled v4.4.0 / v4.4.1 entries omit the commit-SHA link (the commits predate Changesets); new releases will include it.
