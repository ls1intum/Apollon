# Apollon PR #690 — Anti-Inflation Grading Rubric (v2)

> Scope: `chore/release-notes-overhaul` (PR A of three). Worktree: `/Users/felixdietrich/Documents/Apollon-release-overhaul`.
> Prior grade: A (0.94). This rubric is intentionally harder to score on. A is the ceiling for a _competent_ PR; A+ is reserved for excellence that is mechanically verifiable, not aesthetically argued.

## What is anti-inflation about this rubric

The previous rubric rewarded the _absence_ of regressions that no longer exist in the audited state (no fabricated APIs, no marketing voice in CHANGELOGs, no floating action tags, no tense errors). Re-scoring against those criteria would inflate the grade — the work has already moved past them. This rubric instead pressure-tests the failure modes that _survive_ an audited PR: cohesion drift across overlapping documentation files, rhetorical tics that re-enter once the obvious ones are scrubbed, belt-and-suspenders invariants in the lint script that pretend to be load-bearing, PR-description cognitive load, forward-reference speculation, and comment-as-decoration in YAML workflows. Each criterion below names (a) the specific failure mode in 2026 terms, (b) what verifiable A+ looks like, and (c) a one-line check the next agent can run. Most criteria are weight-1; the three that catch the dominant remaining failure modes are weight-3.

Anchors used in calibration:

- agents.md spec — <https://agents.md/>
- GitHub Blog, "How to write a great AGENTS.md — lessons from over 2,500 repositories" — <https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/>
- GitHub community-profile docs — <https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions> and <https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors>
- GitHub Actions secure-use reference — <https://docs.github.com/en/actions/reference/security/secure-use>
- "`pull_request_target` Without Regret" — <https://dev.to/ollieb89/pullrequesttarget-without-regret-secure-fork-prs-in-github-actions-1jpi>
- Changesets config — <https://github.com/changesets/changesets/blob/main/docs/config-file-options.md>
- Positive reference: `vercel/ai` AGENTS.md/CONTRIBUTING.md — <https://github.com/vercel/ai/blob/main/AGENTS.md>, <https://github.com/vercel/ai/blob/main/CONTRIBUTING.md>
- Negative reference: `withastro/astro` AGENTS.md — <https://github.com/withastro/astro/blob/main/AGENTS.md>

---

## Banding (applies to every criterion)

- **F** — Missing, wrong, or actively harmful.
- **D** — Present but materially flawed; reviewer would request changes before merge.
- **C** — Meets the minimum bar; not embarrassing.
- **B** — Solid, in line with industry norms.
- **A** — Better than the median open-source repo at this artefact. The competent ceiling.
- **A+** — _Mechanically verifiable_ excellence: a check defined in this rubric returns clean, AND the artefact does something measurably better than the A reference (vercel/ai). A+ is rare by construction; reviewers should default to A unless they can name the A+ delta.

**Weights**: 1 (table stakes), 2 (matters), 3 (dominant remaining failure mode).

**Scoring**: weighted average across criteria; then apply disqualifiers; then apply the A+ cap (see the bottom).

---

## Criteria

### 1. AGENTS.md content density vs. length — weight 3

The 2026 agents.md guidance (GitHub Blog, 2,500-repo study) recommends six concrete areas — commands, testing, project structure, code style, git workflow, boundaries — and explicitly warns "most agent files fail because they're too vague." `vercel/ai`'s file runs ~300 lines but is table-heavy and command-dense. A 74-line AGENTS.md is fine _if_ every line carries information density an agent can act on. Failure mode: filler sentences ("This document is the entry point", "see X for details") padding a thin file to a respectable-looking length.

- **F** — Missing, or contains fabricated commands/paths.
- **D** — Has the six headings but the content under them is generic ("run the tests, follow the code style").
- **C** — Real commands present but mixed with prose that does not change agent behavior.
- **B** — Every section gives an agent at least one runnable command or concrete invariant. No section is pure prose.
- **A** — Matches `vercel/ai` density: tables or command blocks dominate over prose, boundaries are explicit ("always do / ask first / never do" or equivalent), monorepo sub-areas are addressed.
- **A+** — Achieves B/A density AND demonstrably ports a _specific_ idiom from the Hephaestus/vercel-ai references (cite the file + line range in the PR description), AND no sentence in the file is purely meta ("this file explains…", "below you'll find…").

**Verify**: `wc -l AGENTS.md` (expect ~70–120); then `rg -n '^(this (file|document)|below you|the following)' AGENTS.md` should return zero.

### 2. CONTRIBUTING.md scope discipline vs. AGENTS.md / release-notes.md / .changeset/README.md — weight 3

GitHub's community-profile docs scope CONTRIBUTING.md to "_how_ to contribute (process and expectations)" — explicitly _not_ behavioral standards (CODE_OF_CONDUCT), not templated submission formats (PR template), not internal-only agent context (AGENTS.md). With five overlapping docs in this PR, the failure mode is the same paragraph appearing in three of them.

- **F** — One of these files duplicates >30% of another verbatim, or CONTRIBUTING.md contains agent-only context.
- **D** — Conventional Commits rules / changeset-writing rules / release-notes shape repeated across ≥2 files with materially the same wording.
- **C** — Some overlap, but the canonical home for each topic is identifiable from the file names alone.
- **B** — Each topic has exactly one canonical file; other files link to it rather than restating it.
- **A** — Each file opens with a one-line scope statement that, read together with the other four, partitions the topic space without gaps or seams.
- **A+** — Scope partition holds AND the _order_ a new contributor reads the files in is signposted (e.g. README → CONTRIBUTING → PR template → release-notes.md → .changeset/README.md), AND AGENTS.md does _not_ appear in that human path (it is for agents only).

**Verify**: `for f in CONTRIBUTING.md AGENTS.md docs/development/release-notes.md .github/pull_request_template.md .changeset/README.md; do echo "== $f =="; head -3 "$f"; done` — each should declare its scope in the first three lines.

### 3. Anti-rhetoric in prose files — weight 3

The audited cuts removed marketing voice from CHANGELOGs, but `withastro/astro`'s AGENTS.md shows the next failure mode: self-referential rhetoric ("this is the entry point", "the file you produce _is_ the changelog entry verbatim", "load-bearing"). These phrases feel decisive but carry no information an agent can act on. The user explicitly flagged "load-bearing", "in lockstep", "ergonomic", "modern", "clean" as 2026 tics.

- **F** — Any file contains an unsourced superlative ("best-in-class", "world-class", "battle-tested").
- **D** — More than 5 occurrences of the flagged tic-words across the changed prose files (excluding the lint script, where "load-bearing" is a domain term).
- **C** — 3–5 occurrences; or one self-referential sentence per file.
- **B** — ≤2 occurrences of any single tic-word across all prose files; no "this is the entry point"-style sentences.
- **A** — Zero unsourced superlatives; tic-words appear only where they are technically precise (e.g. "load-bearing field" in code comments referring to changesets config).
- **A+** — A AND every imperative is concrete: `rg -n '^(Try to|Aim to|Strive to|It is important to)' '*.md'` returns zero.

**Verify**: `rg -nw '(load-bearing|in lockstep|ergonomic|modern|clean|seamless|robust|elegant)' -- '*.md' '.changeset/*.md' 'docs/**/*.md'` — count and read each hit in context.

### 4. `check-release-docs.mjs` invariant load-bearingness — weight 2

Three invariants ship: (a) `CLAUDE.md` is a symlink to `AGENTS.md`; (b) every CHANGELOG bullet matches a strict prefix regex; (c) `.changeset/config.json` keeps load-bearing fields. The failure mode is belt-and-suspenders: an invariant the convention or the tool already prevents. The symlink check is borderline — Changesets does not touch `CLAUDE.md`; only a contributor manually replacing it would break it. The bullet-shape check overlaps with what `changesets/changelog-github` (or whatever generator is selected) emits.

- **F** — One of the three invariants is wrong (regex rejects legal output, or symlink check would pass on a hard-link copy).
- **D** — All three present but two are belt-and-suspenders; lint adds CI cost without catching anything Changesets/convention does not already catch.
- **C** — Each invariant has a defensible justification, but the justification is not stated in a header comment in the script.
- **B** — Header comment in `check-release-docs.mjs` names _what specific regression_ each invariant catches, with a concrete example of how that regression would slip past the next-PR pipeline.
- **A** — Plus: the negative-path test (`scripts/fixtures/bad/**`) has one fixture _per invariant_, each fixture's failure message is unique and grep-able, and the test asserts on the message, not on exit code alone.
- **A+** — A AND at least one invariant catches something that is genuinely outside Changesets' own guarantees (e.g. a hand-edit by a contributor between releases), with a 1-line comment citing the Changesets source file or issue that confirms the gap.

**Verify**: `node scripts/check-release-docs.test.mjs` and `rg -n '^// (Invariant|Why):' scripts/check-release-docs.mjs` — every invariant should have a "Why" comment.

### 5. YAML workflow comment fidelity — weight 2

Two new workflows: `verify-changesets.yml` and `pr-title.yml`. Both SHA-pinned. `pr-title.yml` uses `pull_request_target` — the 2026 secure pattern (per <https://dev.to/ollieb89/pullrequesttarget-without-regret-secure-fork-prs-in-github-actions-1jpi> and the GitHub Actions secure-use reference) is metadata-only, no checkout of `head.ref`, explicit minimal permissions. Failure mode: comments that describe what the next line does ("# checkout the repo") instead of why a non-obvious choice was made.

- **F** — Any comment is wrong (claims a safety property the workflow does not have, or vice versa).
- **D** — More than half of the inline comments restate the next line of YAML.
- **C** — Comments are mostly correct but inconsistent; some load-bearing choices are unexplained.
- **B** — Every comment justifies a _non-default_ choice: SHA pin rationale, `pull_request_target` rationale, permissions narrowing, fork-safe pattern.
- **A** — Plus: each SHA pin has the tag-equivalent next to it (`@sha # v1.2.3`), each permission key is the minimum required, `pull_request_target` job has `contents: read` and no `actions/checkout` of `head.ref`.
- **A+** — A AND the workflow file's first ~5 comment lines state the threat model in one sentence (what this workflow trusts, what it does not), so a reviewer does not have to reconstruct it.

**Verify**: `rg -n '^\s*#' .github/workflows/{verify-changesets,pr-title}.yml` — read each comment; `rg -n 'uses: [^@]+@[a-f0-9]{40}' .github/workflows/{verify-changesets,pr-title}.yml` — every third-party `uses:` must be a 40-char SHA.

### 6. "Today vs after next PR" tense honesty — weight 2

Multiple files refer to "after the next PR" / "PR B" / "the upcoming pipeline cutover". Failure mode: one file says "today this runs in CI", another says "this will run in CI" for the same workflow; or "after the next PR" wording drifts between "next PR", "follow-up PR", "PR B", "the cutover PR".

- **F** — A file claims a behavior that does not exist today and does not flag it as future.
- **D** — Tense is correct but the phrasing for "the next PR" varies more than twice across files (3+ distinct phrasings).
- **C** — Two phrasings (e.g. "PR B" and "the next PR") used consistently, each in its own context.
- **B** — One canonical phrasing for the future state. The PR description's "today-vs-next-PR" matrix is the single source of truth and other files link to it (or restate one row verbatim).
- **A** — Every file with a future-tense claim is grep-able by a single token (e.g. `(see PR B)` or `<!-- future:PR-B -->`) so the next PR can find and update them all.
- **A+** — A AND the future-tense tokens are _machine-checkable_ — the lint script (or a new check) fails if any token survives after PR B merges.

**Verify**: `rg -n '(next PR|follow-up PR|PR B|upcoming|will (be|run|land)|in the next|after the cutover)' -- '*.md' '.github/**/*.md' '.changeset/**' 'docs/**/*.md'` — counts should be small, consistent, and grep-able by a single token.

### 7. PR description information architecture — weight 2

Mermaid flowchart + today-vs-next-PR matrix + Open-VSX section + "What lives where" table + Implementation-notes table. The risk is reviewer cognitive load: five visual structures for one PR is at the upper bound of what a senior reviewer will read in full. Failure mode: any two structures conveying the same fact in different shapes.

- **F** — The Mermaid diagram does not render, or any structure contains a wrong claim.
- **D** — Two structures duplicate >50% of their information (e.g. the "what lives where" table and the matrix both list the same files).
- **C** — Each structure has a distinct job, but the reading order is not obvious; a reviewer must scroll back and forth.
- **B** — Each structure answers a different reviewer question (what changed / why now / what's next / how it's enforced / how to verify), in that order.
- **A** — Plus: the description opens with a TL;DR (≤5 lines) that lets a reviewer stop reading and still approve a low-risk PR with confidence; each structure is referenced from the TL;DR by anchor link.
- **A+** — A AND the description is round-trippable: a reviewer who reads only the TL;DR + the matrix can correctly predict what PR B will and will not contain.

**Verify**: `gh pr view 690 --json body -q .body | wc -l` (sanity-check length, expect 80–200), then read the TL;DR; `gh pr view 690 --json body -q .body | rg -c '^##'` (count sections).

### 8. Changesets config field minimality — weight 2

Per <https://github.com/changesets/changesets/blob/main/docs/config-file-options.md>, load-bearing fields are `commit`, `fixed`, `linked`, `baseBranch`, `updateInternalDependencies`, `ignore`, `access`, `privatePackages`. Cosmetic fields are `changelog` (formatter choice) and `prettier`. Failure mode: defaults restated for documentation purposes, making it look like every key is intentional.

- **F** — A field is set to a value that contradicts the PR's stated intent (e.g. `access: public` while the package is private, or `fixed` missing the documented lockstep pair).
- **D** — More than two fields are set to their default values without comment.
- **C** — Defaults restated but with no comment; lint passes but a reader cannot tell which fields are intentional.
- **B** — Every non-default field has a one-line comment in the README or the config (JSON5 not available — comment in `.changeset/README.md`) explaining why.
- **A** — Plus: the fixed/lockstep pair is named in exactly one place (the config) and other files link to it; the OVSX opt-in is gated explicitly (not by omission).
- **A+** — A AND `.changeset/config.json` matches the minimal-diff form: only fields that differ from the documented defaults appear, with a comment block in `.changeset/README.md` mapping each to its rationale.

**Verify**: `jq 'keys' .changeset/config.json` and diff against the documented defaults at <https://github.com/changesets/changesets/blob/main/docs/config-file-options.md>.

### 9. CHANGELOG bootstrap shape parity with Changesets output — weight 2

Four bootstrap CHANGELOGs (`library/`, `standalone/webapp/`, `standalone/server/`, `vscode-extension/`). They must be byte-shape-compatible with what `changesets/action` will append. Failure mode: the bootstrap files include a heading style, separator style, or initial-version section that Changesets does not emit — every future release will then visually disagree with the bootstrap.

- **F** — The bootstrap shape would cause Changesets to insert a section at the wrong heading level or duplicate the package name.
- **D** — Shape parity exists but is undocumented; a future maintainer would not know why the empty file looks the way it does.
- **C** — Comment present but generic ("# Changelog").
- **B** — Each CHANGELOG opens with the exact heading Changesets emits, with a one-line comment (HTML or Markdown) naming the Changesets template version it was generated against.
- **A** — Plus: the lint script's bullet-prefix regex is derived from (or links to) the same Changesets template version.
- **A+** — A AND a fixture test asserts byte-equality with Changesets' actual output for a dummy changeset (run once in CI; ensures the bootstrap survives a Changesets minor bump).

**Verify**: For each CHANGELOG: `head -5 library/CHANGELOG.md` etc. and compare to the format at <https://github.com/changesets/changesets/blob/main/packages/changelog-git/README.md> (or whatever changelog plugin is configured).

### 10. CLAUDE.md → AGENTS.md symlink semantics — weight 1

A POSIX symlink, not a hard link, not a copy, not a stub-with-import. Failure mode: a copy that drifts; or a symlink that breaks under Windows checkout without `core.symlinks=true`.

- **F** — Not a symlink, or symlink target is wrong.
- **D** — Symlink correct but no note about Windows / `core.symlinks` behavior anywhere.
- **C** — Symlink correct, note exists but buried.
- **B** — Symlink correct; CONTRIBUTING.md or AGENTS.md mentions the Windows caveat in one line.
- **A** — Plus: the lint script's symlink check refuses both "regular file" and "symlink-to-wrong-target", with distinct failure messages.
- **A+** — A AND a CI matrix or comment confirms behavior on Windows runners (or explicitly declares Windows unsupported for contributor checkouts).

**Verify**: `test -L CLAUDE.md && readlink CLAUDE.md` (must print `AGENTS.md`); `git ls-files --stage CLAUDE.md` (mode must be `120000`).

### 11. Conventional Commit type allowlist consistency — weight 1

PR template HTML header now lists allowed types. Failure mode: the list in the template diverges from what `pr-title.yml` actually enforces, or from what `CONTRIBUTING.md` documents.

- **F** — Template allows a type the workflow rejects (or vice versa).
- **D** — Three sources (template / workflow / CONTRIBUTING) list types but in different orders or with one missing.
- **C** — Lists agree but maintained in three places.
- **B** — Lists agree; one is documented as the source of truth and others reference it.
- **A** — Plus: the source-of-truth file is the workflow's regex or config (executable), and the template/docs derive from it visibly (comment cites the workflow file).
- **A+** — A AND any future addition to the type list requires editing exactly one file (workflow), with a lint that fails if a stale list survives in the template/docs.

**Verify**: `rg -n '(feat|fix|chore|docs|refactor|test|ci|build|perf|style|revert)' .github/pull_request_template.md .github/workflows/pr-title.yml CONTRIBUTING.md | sort` — the type sets must be equal.

### 12. Forward-reference actionability — weight 1

The PR description names PR B (release pipeline cutover) and PR C (legacy workflow deletion). Failure mode: speculative scope ("PR B may also do X", "PR C might delete Y") that is not actually planned, or worse, that contradicts what the codebase will allow.

- **F** — A forward reference contradicts the current state (e.g. names a file PR C will delete that PR A already deleted).
- **D** — Forward references are vague ("future work", "later") without naming the PR.
- **C** — PR B and PR C named with a short description each, but scope is fuzzy.
- **B** — PR B and PR C each have a one-line scope claim and one acceptance criterion.
- **A** — Plus: each forward reference is grep-able from a single token so PR B's author can find every place that promises something.
- **A+** — A AND the forward references list the _workflows_ PR B will modify and the _workflows_ PR C will delete, by filename, matching files that exist in the current branch.

**Verify**: `rg -n '(PR B|PR C|next PR|follow-up)' -- '*.md' '.github/**/*.md'` and cross-check against the PR description's matrix.

### 13. Mermaid diagram correctness — weight 1

The flowchart in the PR description. Failure mode: renders but is wrong (an arrow goes the wrong way, a node represents a file that does not exist).

- **F** — Does not render.
- **D** — Renders but contains a factual error.
- **C** — Renders, correct, but adds nothing the matrix does not already say.
- **B** — Renders, correct, shows the _flow_ (event → workflow → output → file) that the matrix cannot express linearly.
- **A** — Plus: every node corresponds to a file or workflow that exists in the diff, and arrow labels are events (push / PR opened / `version` ran), not adjectives.
- **A+** — A AND the diagram doubles as a checklist: a reviewer can tick each node off against `git diff --name-only main...HEAD`.

**Verify**: paste into <https://mermaid.live> or `gh pr view 690 --json body -q .body | rg -A 50 '```mermaid'`; cross-reference nodes with `git diff --name-only main...HEAD`.

### 14. `pull_request_target` blast radius — weight 1

Per the GitHub Actions secure-use reference and the 2026 "without regret" pattern: metadata only, no checkout of `head.ref`, explicit `permissions`, no secrets passed to fork-derived inputs.

- **F** — Workflow runs fork code with elevated permissions, or has implicit `permissions: write-all`.
- **D** — Permissions set but broader than needed (e.g. `contents: write` when read suffices).
- **C** — Permissions minimal; no explicit comment naming the threat model.
- **B** — Permissions minimal; one-line comment confirms metadata-only operation.
- **A** — Plus: no `actions/checkout` step at all in the `pull_request_target` job, OR if checkout is present, it checks out `base.ref` (trusted) not `head.ref`.
- **A+** — A AND the comment block cites the GitHub Actions secure-use reference URL or the GitHub Security Lab post that motivates the pattern.

**Verify**: `rg -n 'pull_request_target|permissions|actions/checkout' .github/workflows/pr-title.yml` — read each in context.

### 15. README / .changeset/README cohabitation — weight 1

`.changeset/README.md` is generated by Changesets and is usually left alone. Failure mode: this PR rewrites it into a third contributor-facing doc that duplicates CONTRIBUTING.md.

- **F** — `.changeset/README.md` contains contradictory guidance vs CONTRIBUTING.md or release-notes.md.
- **D** — Substantially rewritten into a tutorial; >2x default length without justification.
- **C** — Lightly customized but adds duplication.
- **B** — Default Changesets README with a short Apollon-specific addendum that names _only_ facts not in CONTRIBUTING.md (e.g. the fixed pair, OVSX opt-in).
- **A** — Plus: any Apollon-specific content is wrapped in a clearly delineated block (HTML comment markers) so a future `changeset init` upgrade can be merged with `git diff` confidence.
- **A+** — A AND the addendum is generated from a single source (the config rationale comment), not maintained separately.

**Verify**: `wc -l .changeset/README.md` (expect ~30–60), then diff against `npx @changesets/cli init` baseline.

---

## Bullshit-detection sub-criteria (apply to every prose file)

These are tic-detectors. Each triggered tic counts; thresholds feed criterion 3 and can independently trip a disqualifier.

1. **Tic-word recurrence**: `rg -nw '(load-bearing|in lockstep|ergonomic|modern|clean|seamless|elegant|robust|cohesive|first-class)'`. More than 5 hits across the PR's prose files → disqualifier.
2. **Self-referential rhetoric**: any sentence matching `^(This (file|document) is|The file you produce is|This is the entry point|Below you will find|The following is|What follows is)`. Any single hit drops criterion 3 by one band.
3. **Unsourced superlatives**: `(best-in-class|world-class|industry-leading|battle-tested|best practice|state of the art)` anywhere in changed prose. Any hit is a disqualifier.
4. **Empty imperatives**: `^(Try to|Aim to|Strive to|It is important to|Make sure to|Be sure to)`. More than 3 across prose files drops criterion 3 by one band.
5. **Decorative comments in YAML**: comments that restate the next line ("# checkout the repo" above `uses: actions/checkout@…`). More than 2 drops criterion 5 by one band.
6. **Future-tense drift**: more than two distinct phrasings for "the next PR" drops criterion 6 by one band (see criterion 6 verifier).

---

## Hard disqualifiers

Each disqualifier drops the final letter grade by at least one band. Cumulative cap: **−2 letters total**. (Three disqualifiers do not drop three letters — the cap holds at two, but a third should prompt the reviewer to ask whether the PR is mergeable at all.)

1. **Symlink wrong**: `CLAUDE.md` is not a POSIX symlink to `AGENTS.md`, or the symlink target is missing.
2. **Workflow not SHA-pinned**: any third-party `uses:` in the new workflows references a tag or branch instead of a 40-char SHA.
3. **`pull_request_target` checks out fork code**: any `actions/checkout` in the `pull_request_target` job uses `ref: github.event.pull_request.head.*` or equivalent.
4. **Lint script fails on its own fixtures**: `node scripts/check-release-docs.test.mjs` does not exit 0, or the negative-path fixtures do not actually fail the linter.
5. **CHANGELOG shape drift**: a bootstrap CHANGELOG would not byte-cleanly accept the next Changesets append (heading level, separator, or initial-version section wrong).
6. **Forward reference contradiction**: the PR description names a file PR C will delete that PR A has already deleted (or vice versa).
7. **Unsourced superlative** (see tic-detector #3).
8. **Tic-word flood** (see tic-detector #1).
9. **Conventional-type list drift**: PR template, workflow regex, and CONTRIBUTING.md do not agree on the allowed Conventional Commit types.
10. **Changesets config field contradicts intent**: e.g. `access: public` on a private package, or `fixed` missing the documented lockstep pair.

---

## A+ cap

Even with a clean disqualifier list, the final grade cannot be A+ unless **at least two weight-3 criteria score A+** AND **no criterion scores below B**. This is the dominant anti-inflation lever: a single coast through criterion 1, 2, or 3 caps the PR at A regardless of polish elsewhere.

A second cap: if the verification command for any criterion was _not actually run_ by the reviewer (or run but not reported), that criterion's score caps at B for the purpose of the final grade. A+ requires receipts.

---

## How to apply (5 lines)

1. Clone the worktree, run every "Verify" command, paste outputs into a scratch file before assigning bands.
2. Score each criterion to a single band based on the output; do not soften the band because the rest of the PR is good.
3. Apply tic-detectors; record every triggered detector with its grep hit, then update affected criteria.
4. Apply hard disqualifiers (max −2 letters); if three or more trip, raise the question of mergeability rather than letter grade.
5. Apply the A+ cap (≥2 weight-3 criteria at A+, no criterion below B, every Verify command run). Default to A unless you can name the A+ delta in one sentence per qualifying criterion.
