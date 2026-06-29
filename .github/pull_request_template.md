<!-- PR title = Conventional Commit subject (feat/fix/…). Squash-merge: title + body become the commit. The TYPE you pick decides which group your change lands in the published release notes (mapping: https://ls1intum.github.io/Apollon/contributor/development/release-notes#how-your-change-gets-grouped) — so choose it deliberately. Run `pnpm changeset` if you change a Changesets-tracked package (@tumaet/apollon, @tumaet/webapp, @tumaet/server). See CONTRIBUTING.md. -->

### Summary

<!-- What changed and why, for the reviewer. Implementation detail lives here, not in the release note below. -->

### Release note

<!--
One sentence in the USER's voice — this is the wording that goes in your `pnpm changeset` summary and becomes the published changelog entry verbatim. Lead with what the user can now do, or (for a fix) the symptom that's gone. No internal types, hook names, or file paths.
Write "n/a — no Changesets-tracked package changed" if this PR doesn't touch @tumaet/apollon, @tumaet/webapp, or @tumaet/server.
-->

### Implementation notes

<!-- Approach, trade-offs, alternatives considered, follow-ups. -->

### Steps for testing

1. …

### Screenshots / screencasts

<!-- Required for UI changes. -->

### Checklist

- [ ] Linked to a related issue (if applicable)
- [ ] Added a changeset whose summary is written in the user's voice (`pnpm changeset`, [how](https://ls1intum.github.io/Apollon/contributor/development/release-notes/)) — or this PR doesn't touch a Changesets-tracked package (`@tumaet/apollon`, `@tumaet/webapp`, `@tumaet/server`)
- [ ] PR title's Conventional Commit type (`feat`/`fix`/…) matches the kind of change — it groups the release note
- [ ] Tests added or updated
- [ ] Ran `pnpm lint && pnpm format:check && pnpm build && pnpm test` locally — green
- [ ] Documentation updated (if applicable)
- [ ] Screenshots or screencasts attached (if a UI change)
