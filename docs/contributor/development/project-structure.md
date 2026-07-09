---
id: project-structure
title: Project structure
description: Top-level layout of the Apollon pnpm-workspaces monorepo.
---

# Project structure

Apollon is a pnpm-workspaces monorepo. Top-level layout:

```
Apollon/
├── library/                  # @tumaet/apollon — published to npm
│   ├── lib/                  # TypeScript source
│   ├── tests/
│   └── package.json
├── packages/
│   └── ui/                   # @tumaet/ui — shadcn-style design system (Base UI + Tailwind v4)
│       ├── src/              # components, stories, compiled CSS sources
│       └── package.json
├── standalone/
│   ├── server/               # @tumaet/server — Hono + Redis + WebSocket relay
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── webapp/               # @tumaet/webapp — the browser-hosted app
│       ├── src/
│       ├── tests/            # Playwright e2e + visual regression
│       ├── Dockerfile
│       └── package.json
├── vscode-extension/         # apollon-extension — VS Code extension
│   ├── src/                  # extension host (custom text editor, tree view, commands)
│   └── webview/              # @tumaet/vscode-webview — diagram canvas (Vite)
├── docker/                   # Compose files for local + production
├── docs/                     # Documentation sources (this directory)
├── scripts/                  # dev.mjs and other monorepo helpers
├── .github/workflows/        # CI, release, and deploy workflows
├── .nvmrc                    # Node.js version (consumed by nvm)
├── commitlint.config.mjs     # Conventional-commits enforcement
├── pnpm-workspace.yaml       # pnpm workspace definition + settings + overrides
├── .npmrc                    # pnpm/registry settings
├── package.json              # Root workspace manifest (packageManager field pins pnpm version)
└── README.md
```

## Workspaces

| Workspace                   | Name                     | Published as                                                                                         |
| --------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `library/`                  | `@tumaet/apollon`        | [npm](https://www.npmjs.com/package/@tumaet/apollon)                                                 |
| `packages/ui/`              | `@tumaet/ui`             | internal design system (consumed by the webapp; not published)                                       |
| `standalone/webapp/`        | `@tumaet/webapp`         | `ghcr.io/ls1intum/apollon/webapp`                                                                    |
| `standalone/server/`        | `@tumaet/server`         | `ghcr.io/ls1intum/apollon/server`                                                                    |
| `vscode-extension/`         | `apollon-extension`      | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=aet-tum.apollon-extension) |
| `vscode-extension/webview/` | `@tumaet/vscode-webview` | bundled into the extension VSIX                                                                      |
| `docs/`                     | `@tumaet/docs`           | published as the Docusaurus site at <https://ls1intum.github.io/Apollon/>                            |

The scope carries the organization and the name carries the role, so `@tumaet/apollon` is the product and every other workspace is named for the job it does. `apollon-extension` is the sole exception: the VS Code Marketplace requires an extension name to match `[a-z0-9][a-z0-9-]*`, so `vsce` rejects a scope outright.

Its Marketplace identity is `publisher.name` — `aet-tum.apollon-extension`, where `aet-tum` is the organization's publisher, alongside `aet-tum.iris-thaumantias`. `publisher` and `name` in `vscode-extension/package.json` are the only source for that identity: the release workflow reads both to decide which listing to query, which tag to cut, and what to print in the release notes. Changing either points the release at a different listing, and installed clients follow the identity, not the repository — a new identity reaches nobody who already has the extension.

The name reads oddly for a package whose directory is `vscode-extension/`, and it cannot be improved. The Marketplace reserves both an extension's `name` and its `displayName` across **all** publishers, and the abandoned `tumaet.apollon-vscode` listing — from `ls1intum/apollon-vscode`, the archived repository this workspace replaced — holds `apollon-vscode` and `Apollon` respectively. Claiming either fails at publish time, server-side, with `already exists in the Marketplace` or `This extension display name is taken`. So the manifest keeps `apollon-extension` / `Apollon - TUM`: the listing this project already owns, whose display name also matches its sibling `aet-tum.iris-thaumantias` (`Artemis - TUM`). Releases update that listing in place, and the installs it carries keep receiving them.

`vsce` resolves relative README links against the repository root, ignoring `repository.directory` ([vscode-vsce#980](https://github.com/microsoft/vscode-vsce/issues/980)), so an extension in a subdirectory ships links one level too high — silently, with no warning. The `package:vsix` script therefore passes `--baseContentUrl` and `--baseImagesUrl` pointing at `vscode-extension/`, and the release workflow packages through that script rather than calling `vsce` itself. A README link may not escape the extension root either: `../LICENSE` survives verbatim into the URL, and GitHub does not normalize `..` in a blob path.
