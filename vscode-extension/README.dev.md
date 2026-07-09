# Apollon for VS Code — developer guide

Build, run, and release notes for the [Apollon VS Code extension](./README.md). User-facing docs live in [`README.md`](./README.md).

## Layout

Two pnpm workspaces:

- [`src/`](./src) — `apollon-vscode`, the extension host (Vite library mode, CJS output). Registers a `CustomTextEditorProvider` for `*.apollon`, a native tree view of the workspace's diagrams, and the `Apollon: …` commands. It reaches the filesystem only through `vscode.workspace.fs`, so it works in virtual and remote workspaces. It is not a [web extension](https://code.visualstudio.com/api/extension-guides/web-extensions): there is no `browser` entry point.
- [`webview/`](./webview) — `apollon-vscode-webview`, the canvas that hosts the `@tumaet/apollon` editor (Vite).

[`src/shared/protocol.ts`](./src/shared/protocol.ts) is the single typed contract between the two, and the class doc on [`ApollonEditorProvider`](./src/apollonEditorProvider.ts) explains how document and canvas stay in sync.

## Install dependencies

From the monorepo root:

```sh
pnpm install
```

## Run locally

```sh
pnpm --filter apollon-vscode-webview start  # webview
pnpm --filter apollon-vscode watch          # extension host
```

Then press <kbd>F5</kbd> in VS Code (or <kbd>Cmd/Ctrl+Shift+P</kbd> → **Debug: Start Debugging**) to launch an Extension Development Host window. Pressing <kbd>F5</kbd> without the watchers running builds both once.

## Checks

```sh
pnpm --filter apollon-vscode typecheck
pnpm --filter apollon-vscode test     # host-side unit tests
pnpm --filter apollon-vscode lint
```

## Release

The extension shares Apollon's version. Changesets bumps it with the library and the standalone apps, and merging the **Version Packages** PR is what publishes it — `Release VS Code Extension` fires on the version change. Record user-visible work with `pnpm changeset` like anywhere else in the repo. See [`docs/contributor/deployment/npm-publishing.md`](../docs/contributor/deployment/npm-publishing.md) for the full pipeline.

`vsce` is not a workspace dependency. The release workflow installs it into a
temporary prefix with `--ignore-scripts`, keeping its credential store (a native
postinstall) and Azure SDK out of every contributor's `pnpm install`. Run
`package:vsix` against a `vsce` you installed the same way.
