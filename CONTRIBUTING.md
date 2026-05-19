# Contributing to Apollon

Thanks for contributing. Deeper docs live under [`docs/`](docs/); the agent-facing contract lives in [`AGENTS.md`](AGENTS.md).

## Reporting bugs

1. Search the [issue tracker](https://github.com/ls1intum/Apollon/issues) first.
2. If new, open an issue with reproduction steps, expected vs. actual behaviour, and the version (npm package version, Docker tag, or VS Code extension version).

## Suggesting features

Open an issue. Describe the use case and the proposed UX; we'll discuss before any implementation lands.

## Code contributions

### Setup

Prerequisites:

- **Node.js** `>=22.14.0` (`nvm use` honours [`.nvmrc`](.nvmrc)).
- **npm** `>=11.1.0`.
- **Docker** for the local Redis Stack (used by `npm run dev`).
- iOS / Android prerequisites only if you touch the mobile build — see [`docs/mobile/ios-android-setup.md`](docs/mobile/ios-android-setup.md).

```sh
git clone git@github.com:ls1intum/Apollon.git
cd Apollon
nvm use && npm install
npm run dev        # library watch + server + webapp, with Redis on Docker
```

### Branch and commit

1. Fork the repo (external contributors) or create a branch off `main` (maintainers): `git checkout -b feature/<short-name>`.
2. Make your change. Prettier and ESLint are authoritative — `npm run format && npm run lint` should pass.
3. Run tests: `npm test` (library Vitest suite), `npm run test:e2e` (webapp Playwright suite) where applicable.
4. Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/) (`<type>(<scope>)?: <subject>`). Allowed types live in [`commitlint.config.mjs`](commitlint.config.mjs); the PR template's header lists them inline.

### Add a changeset (for user-visible PRs)

```sh
npm run changeset
```

Skip on docs-only, CI-only, or pure-refactor PRs. **Writing rules**: [`docs/development/release-notes.md`](docs/development/release-notes.md).

### Open the pull request

Push your branch and open a PR against `main`. The repository is **squash-merge only** — your PR title becomes the merge commit subject and your PR body becomes its body, so write both with that in mind.

Required CI checks:

- `pr-title` — validates the PR title against commitlint.
- `verify-changesets` — lints `.changeset/config.json` shape + the CLAUDE.md symlink, and reports `changeset status`.
- The usual lint / format / unit / e2e / build matrix.

## Releases

A maintainer cuts releases (npm + Docker via cosign + VS Marketplace). Writing rules in [`docs/development/release-notes.md`](docs/development/release-notes.md); deployment surface in [`docs/deployment/github-actions.md`](docs/deployment/github-actions.md).

## AI coding agents

Claude Code, Cursor, Copilot, Codex, and similar agents follow [`AGENTS.md`](AGENTS.md).

## Code of conduct

Be respectful. Contributions from accounts using real names + authentic profile pictures only (consistent with [GitHub's Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)).

## License

By contributing you agree that your contribution will be licensed under the project's [MIT License](LICENSE).
