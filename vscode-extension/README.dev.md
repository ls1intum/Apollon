# Apollon for VS Code — developer guide

Build, run, and release notes for the [Apollon VS Code extension](./README.md). User-facing docs live in [`README.md`](./README.md).

## Layout

The extension is three pnpm workspaces:

- [`editor/`](./editor) — `apollon-vscode-editor`, webview that hosts the `@tumaet/apollon` editor (Vite + Tailwind v4).
- [`menu/`](./menu) — `apollon-vscode-menu`, webview that renders the diagram-picker (Vite + Tailwind v4).
- [`src/`](./src) — `apollon-vscode`, the extension's Node entry point that wires the webviews into VS Code (Vite library mode, CJS output for the extension host).

## Install dependencies

From the monorepo root:

```sh
pnpm install
```

pnpm installs all workspaces in one pass — no per-webview install step.

## Run locally

Run three watchers in parallel terminals:

```sh
pnpm --filter apollon-vscode-menu start    # menu webview
pnpm --filter apollon-vscode-editor start  # editor webview
pnpm --filter apollon-vscode watch         # extension host
```

Then press <kbd>F5</kbd> in VS Code (or <kbd>Cmd/Ctrl+Shift+P</kbd> → **Debug: Start Debugging**) to launch the extension in a new Extension Development Host window. Keep all three watchers running.

## Release

Bumps and publishes go through the `Version Bump (VS Code extension)` → `Release VS Code Extension` workflows. See [`docs/contributor/deployment/npm-publishing.md`](../docs/contributor/deployment/npm-publishing.md) for the full pipeline.
