<!--
PR title must be a Conventional Commit subject (feat:, fix(scope):, …).
The repo is squash-merge only; your title + this body become the commit.
If your PR changes a published or operator-visible workspace, run
`npm run changeset` and commit the resulting `.changeset/*.md`.
See AGENTS.md and docs/development/release-notes.md.
-->

### Summary

<!-- What changed and why, for the reviewer. The user-facing wording lives in the changeset body. -->

Closes #

### Implementation notes

<!-- Approach, trade-offs, alternatives considered, follow-ups. -->

### Steps for testing

1. …

### Screenshots / screencasts

<!-- Required for UI changes. -->

### Checklist

- [ ] Linked to a related issue (if applicable)
- [ ] Added a changeset (`npm run changeset`), or this PR doesn't change a published / deployed artefact
- [ ] Tests added or updated
- [ ] Documentation updated (if applicable)
- [ ] Screenshots or screencasts attached (if a UI change)
