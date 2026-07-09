# `src/shared`

The contract between the extension host (`src/`, Node) and the canvas
(`webview/src/`, browser). Both sides import from here, so nothing in this
directory may import `vscode` — that module exists only inside the extension
host, and pulling it in would break the webview bundle. `eslint.config.mjs`
enforces this.
