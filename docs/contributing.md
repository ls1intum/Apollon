# Contributing

Contributions are welcome. The short version is below; for deeper setup detail see the root [README](../README.md) and [`docs/getting-started/setup.md`](getting-started/setup.md).

## Flow

1. Fork the repo, then branch off `main`:

   ```sh
   git checkout -b feature/<short-name>
   ```

2. Make your change. Keep to the existing TypeScript + React conventions; Prettier and ESLint are authoritative.

3. Verify locally:

   ```sh
   npm run lint
   npm run test
   npm run build
   ```

4. **Add a changeset** for any change that touches a published or operator-visible workspace:

   ```sh
   npm run changeset
   ```

   The CLI asks which packages bump and what bump type (`patch` / `minor` / `major`); then you write **one sentence in the user's voice** that becomes the changelog entry verbatim. Read [`development/release-notes.md`](development/release-notes.md) before writing it — the wording rules are load-bearing.

   Docs-only, CI-only, and pure-refactor PRs don't need a changeset; explain why in the PR description.

5. Commit with a [Conventional Commits](https://www.conventionalcommits.org/) subject (enforced by `commitlint.config.mjs`):

   ```sh
   git commit -m "feat: <what changed>"
   ```

6. Push your branch and open a pull request against `main`. The repo is squash-merge only — your PR title becomes the merge commit subject, your PR body becomes its body, and your changeset body lands in the changelog.

## Releases

Changesets-driven. Accumulated changesets on `main` aggregate into a long-lived **Version Packages** PR; merging it cuts tags, publishes the library to npm, retags + cosign-signs the Docker images for the standalone, and publishes the VS Code extension. See [`development/release-notes.md`](development/release-notes.md) for the writing rules and [`deployment/github-actions.md`](deployment/github-actions.md) for the deployment surface.

Agents (Claude, Cursor, Copilot, Codex, …) follow [`AGENTS.md`](../AGENTS.md).
