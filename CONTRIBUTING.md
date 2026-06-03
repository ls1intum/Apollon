# Contributing

Thank you for considering contributing to Apollon. The full contributor guide lives in the docs site:

**→ [Contributor Guide](https://ls1intum.github.io/Apollon/contributor/)** (or `docs/contributor/` in the repo)

In short:

```sh
git clone git@github.com:ls1intum/Apollon.git
cd Apollon
nvm install && nvm use
pnpm install
pnpm dev
```

Before pushing:

```sh
pnpm run lint
pnpm run format:check
pnpm run build
pnpm test
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) with a constrained scope set — see `commitlint.config.mjs`. The repository is **squash-merge only**, so your PR title is the merge commit subject and is checked against the same rules.

On any PR that changes a published or operator-visible package, add a changeset:

```sh
pnpm changeset
```

It becomes the changelog entry — writing rules are in the [release-notes guide](https://ls1intum.github.io/Apollon/contributor/development/release-notes/). Skip it on docs-, CI-, or refactor-only PRs.

AI coding agents (Claude Code, Cursor, Copilot, Codex, …) follow [`AGENTS.md`](./AGENTS.md).

By participating in this project you agree to abide by its [Code of Conduct](./CODE_OF_CONDUCT.md).
