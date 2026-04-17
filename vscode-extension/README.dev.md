# Apollon for VS Code — developer guide

Build, run, and release notes for the [Apollon VS Code extension](./README.md). User-facing docs live in [`README.md`](./README.md).

## Layout

The extension is three workspaces:

- [`editor/`](./editor) — webview that hosts the `@tumaet/apollon` editor.
- [`menu/`](./menu) — webview that renders the diagram-picker menu.
- [`src/`](./src) — the extension's Node entry point that wires the webviews into VS Code.

## Install dependencies

```sh
npm run install:all
```

## Run locally

In one terminal, start the menu webview:

```sh
npm run start:menu
```

In another, start the editor webview:

```sh
npm run start:editor
```

Then press <kbd>F5</kbd> in VS Code (or <kbd>Cmd/Ctrl+Shift+P</kbd> → **Debug: Start Debugging**) to launch the extension in a new Extension Development Host window. Keep both dev servers running — the Host loads the webviews from them.

## Release

Releases ship through GitHub Releases in the monorepo; GitHub Actions then builds the VSIX and publishes to the Marketplace. To cut a release:

1. Go to **Releases** in the [`ls1intum/Apollon`](https://github.com/ls1intum/Apollon) repository.
2. **Draft a new release**, pick a tag matching the new version (e.g. `vscode-v1.5.0`), and click **Generate release notes**.
3. Publish the release. The release workflow builds and uploads the VSIX artifact and publishes the new version to the Marketplace.

Marketplace propagation can take a few minutes after the workflow completes; VS Code still has to accept the update.
