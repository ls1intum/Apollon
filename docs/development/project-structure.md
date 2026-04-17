# Project structure

Apollon is an npm-workspaces monorepo. Top-level layout:

```
Apollon/
├── library/                  # @tumaet/apollon — npm library
│   ├── lib/                  # TypeScript source
│   ├── tests/
│   └── package.json
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
├── vscode-extension/         # apollon-vscode — VS Code extension (webviews in editor/ and menu/)
├── docker/                   # Compose files for local + production
├── docs/                     # Documentation sources (this directory)
├── scripts/                  # dev.mjs and other monorepo helpers
├── .github/workflows/        # CI, release, and deploy workflows
├── .nvmrc                    # Node.js version (consumed by nvm)
├── commitlint.config.mjs     # Conventional-commits enforcement
├── package.json              # Root workspace manifest
└── README.md
```

## Workspaces

| Workspace                 | Name                | Published as                                           |
| ------------------------- | ------------------- | ------------------------------------------------------ |
| `library/`                | `@tumaet/apollon`   | [npm](https://www.npmjs.com/package/@tumaet/apollon)   |
| `standalone/webapp/`      | `@tumaet/webapp`    | `ghcr.io/ls1intum/apollon/webapp`                      |
| `standalone/server/`      | `@tumaet/server`    | `ghcr.io/ls1intum/apollon/server`                      |
| `vscode-extension/`       | `apollon-vscode`    | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=tumaet.apollon-vscode) |
