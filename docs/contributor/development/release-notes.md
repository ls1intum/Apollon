---
id: release-notes
title: Release notes
description: How to write the changeset that becomes a changelog entry — voice, bump type, worked examples.
---

# Release-notes style guide

User-facing release notes come from [Changesets](https://github.com/changesets/changesets). One changeset per user-visible PR; its summary becomes the changelog entry verbatim.

Four release lines carry changesets: `@tumaet/apollon` on npm, `@tumaet/webapp` + `@tumaet/server` as paired `ghcr.io` Docker images, and `apollon-extension` on the VS Marketplace. All four share one version — they sit in a single `fixed` group in `.changeset/config.json`, so a release advances them together. The docs site and the extension's webview sub-package are excluded in `#ignore`: they have no release flow of their own, and without the exclusion a routine library bump would version them too, since every package depends on `@tumaet/apollon` via `workspace:*`.

:::note
The pipeline that consumes changesets is live: `release.yml` opens a **Version Packages** PR that runs `changeset version` → regenerates `CHANGELOG.md` → triggers the release on merge. Write the changeset and the rest is automatic — don't hand-edit `CHANGELOG.md`. See [Releases](/contributor/deployment/npm-publishing).
:::

## When do you need one?

Add a changeset whenever a **user, embedder, or operator would notice** a change to `@tumaet/apollon`, `@tumaet/webapp`, `@tumaet/server`, or `apollon-extension` — a new feature, a bug fix, a changed API, or a new deployment step. A VS Code-only change needs one too: it is what gives the extension its version bump and its Marketplace release notes.

Skip it when nothing downstream is affected: docs, CI, tests, refactors, and formatting — plus anything touching only the docs site (excluded above). When unsure, add one; an extra changelog line beats a silent gap. The advisory **Verify changesets** check on each PR reminds you.

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

A quick test: your summary should finish the sentence _"After this change, you can…"_ (a feature) or _"This used to happen and no longer does:…"_ (a fix). If the only way to finish it is by naming a function, a type, or a file, it's still in the engineer's voice — rewrite it. Start with a present-tense verb the user understands: _Adds, Fixes, Improves, Removes._

For an embedder-facing library change, name the API and describe the contract instead — see [Per-package conventions](#per-package-conventions) below.

For **breaking changes**, mark the changeset `major` and link a migration runbook — the GitHub Release body, or [`ops/operations.md`](https://github.com/ls1intum/Apollon/blob/main/ops/operations.md).

## How your change gets grouped

The published release notes group entries by **what kind of change it is** — Features, Bug Fixes, Performance, and so on. You don't tag the group by hand: `scripts/extract-changelog.mjs` derives it from your PR's Conventional Commit **type** (the prefix of the PR title, e.g. `feat:`). So two things travel together on every user-visible PR:

- the **type** in your PR title decides the **group**, and
- the **changeset summary** supplies the **user-voice text** under it — the script moves it verbatim and never rewrites it, so the voice (including any stray `feat:` prefix) is yours to get right in the changeset.

| PR title type                                                               | Release-notes group | Use it for                                                              |
| --------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `feat`                                                                      | Features            | a new capability a user, embedder, or operator can now use              |
| `fix`                                                                       | Bug Fixes           | something that was broken now works                                     |
| `perf`                                                                      | Performance         | same behaviour, measurably better (speed, memory, bundle size)          |
| `docs`                                                                      | Documentation       | user-facing docs shipped with a tracked package                         |
| `build`/`chore` with the `deps` scope                                       | Dependencies        | a user-visible dependency bump                                          |
| a `!` in the PR title (e.g. `feat!:`)                                       | Breaking Changes    | also mark the changeset `major` and link a migration runbook            |
| `refactor`, `style`, `test`, `ci`, `revert`, and non-`deps` `build`/`chore` | Other Changes       | present only if such a change was deliberately given a changeset (rare) |

Pick the type for the change the **user** sees, not for the mechanics of the diff: a one-line code change that restores broken sharing is a `fix`, not a `refactor`. Type → group, summary → voice; if the type is wrong, the right release note lands in the wrong section.

The type is recovered by resolving each entry's commit SHA against git history. When git can't resolve it — an older entry with no commit link, a shallow checkout, or git being unavailable — the script falls back to whatever semver bump the author chose (`major` → Breaking, `minor` → Features, `patch` → Bug Fixes). This is lossier: `perf` and `docs` have no dedicated fallback group, so they collapse into Features or Bug Fixes by the chosen bump. Releases check out the full history (`fetch-depth: 0`) precisely so the accurate commit-type path is the norm and the fallback is the exception.

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

`CHANGELOG.md` is the per-version bullet log Changesets writes — tool-owned, not edited by hand, and grouped by semver bump (`### Minor Changes` / `### Patch Changes`). The **GitHub Release body** is generated from that same section (via `scripts/extract-changelog.mjs`), but **regrouped by category** (Features, Bug Fixes, …; see [How your change gets grouped](#how-your-change-gets-grouped)) plus a per-track install/verify footer — your entry text is moved under a category heading verbatim, never rewritten, so the Release reads in the voice you wrote. A maintainer can still edit the published Release afterward to add a lede, screenshots, or video.

You write only the changeset body (the markdown after the frontmatter). At `changeset version` time, `@changesets/changelog-github` prepends the PR link, commit link, and `Thanks @author!` automatically. The backfilled v4.4.0 / v4.4.1 entries omit the commit-SHA link — those commits predate Changesets; new releases include it.
