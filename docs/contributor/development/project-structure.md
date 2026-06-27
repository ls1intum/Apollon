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
│   ├── server/               # @tumaet/server — Express + Redis + WebSocket relay
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── webapp/               # @tumaet/webapp — the browser-hosted app
│       ├── src/
│       ├── tests/            # Playwright e2e + visual regression
│       ├── Dockerfile
│       └── package.json
├── vscode-extension/         # apollon-vscode — VS Code extension
│   ├── editor/               # apollon-vscode-editor — diagram webview (Vite)
│   └── menu/                 # apollon-vscode-menu — diagram-picker webview (Vite)
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

| Workspace                  | Name                    | Published as                                                                                     |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `library/`                 | `@tumaet/apollon`       | [npm](https://www.npmjs.com/package/@tumaet/apollon)                                             |
| `packages/ui/`             | `@tumaet/ui`            | internal design system (consumed by the webapp; not published)                                   |
| `standalone/webapp/`       | `@tumaet/webapp`        | `ghcr.io/ls1intum/apollon/webapp`                                                                |
| `standalone/server/`       | `@tumaet/server`        | `ghcr.io/ls1intum/apollon/server`                                                                |
| `vscode-extension/`        | `apollon-vscode`        | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tumaet.apollon-vscode) |
| `vscode-extension/menu/`   | `apollon-vscode-menu`   | bundled into the extension VSIX                                                                  |
| `vscode-extension/editor/` | `apollon-vscode-editor` | bundled into the extension VSIX                                                                  |
| `docs/`                    | `@tumaet/apollon-docs`  | published as the Docusaurus site at <https://ls1intum.github.io/Apollon/>                        |
