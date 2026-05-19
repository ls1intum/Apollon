# Contributing to Apollon

Thanks for contributing. Deeper docs live under [`docs/`](docs/); the conventions AI coding agents follow live in [`AGENTS.md`](AGENTS.md).

## Issues

Search the [issue tracker](https://github.com/ls1intum/Apollon/issues) first. Open an issue with repro steps (for bugs) or use case (for features) before implementation lands.

## Code contributions

### Setup

Toolchain pins (Node, npm, Docker) are in [`AGENTS.md`](AGENTS.md#toolchain). iOS / Android prerequisites only if you touch the mobile build — see [`docs/mobile/ios-android-setup.md`](docs/mobile/ios-android-setup.md).

```sh
git clone git@github.com:ls1intum/Apollon.git
cd Apollon
nvm use && npm install
npm run dev        # library watch + server + webapp, with Redis on Docker
```

**Windows contributors**: enable symlinks before cloning (`git config --global core.symlinks true`, plus Developer Mode on Windows 10), or `CLAUDE.md` will check out as a text file. CI catches this on push via `check:release-docs`.

### Branch and commit

1. Fork the repo (external contributors) or create a branch off `main` (maintainers): `git checkout -b feature/<short-name>`.
2. Make your change. Prettier and ESLint are authoritative — `npm run format && npm run lint` should pass.
3. Run tests: `npm test` (library Vitest suite), `npm run test:e2e` (webapp Playwright suite) where applicable.
4. Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/) (`<type>(<scope>)?: <subject>`). Allowed types come from [`@commitlint/config-conventional`](https://www.npmjs.com/package/@commitlint/config-conventional), which [`commitlint.config.mjs`](commitlint.config.mjs) extends; the PR template lists them inline.

### Add a changeset (for user-visible PRs)

```sh
npm run changeset
```

Skip on docs-only, CI-only, or pure-refactor PRs. **Writing rules**: [`docs/development/release-notes.md`](docs/development/release-notes.md).

### Open the pull request

Push your branch and open a PR against `main`. The repository is **squash-merge only** — your PR title becomes the merge commit subject and your PR body becomes its body, so write both with that in mind.

CI runs on every PR:

- `pr-title` (gating) — validates the PR title against commitlint.
- `verify-changesets` — gates on the `.changeset/config.json` + CLAUDE.md-symlink invariants; reports `changeset status` advisorially (does not block merge).
- The usual lint / format / unit / e2e / build matrix.

## Releases

A maintainer cuts releases (npm + Docker via cosign + VS Marketplace). Writing rules in [`docs/development/release-notes.md`](docs/development/release-notes.md); deployment surface in [`docs/deployment/github-actions.md`](docs/deployment/github-actions.md).

## AI coding agents

Claude Code, Cursor, Copilot, Codex, and similar agents follow [`AGENTS.md`](AGENTS.md).

## License

By contributing you agree that your contribution will be licensed under the project's [MIT License](LICENSE).
