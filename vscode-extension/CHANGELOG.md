# apollon-vscode

## 5.1.1

### Patch Changes

- [#809](https://github.com/ls1intum/Apollon/pull/809) [`6c8f782`](https://github.com/ls1intum/Apollon/commit/6c8f782532dcbc096a36ee28ae3dde96c21117f1) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Apollon for VS Code now carries the same version as the rest of Apollon, so the extension you install and the library it renders with are one number.

  If you have used the extension before, version `0.0.17` wrote `"files.associations": { "*.apollon": "json" }` into your user settings every time it started. Nothing writes or needs it now. Diagrams open in the Apollon editor either way, but while that line remains, opening one as text shows it as plain JSON instead of an Apollon diagram. Deleting it restores the file icon and syntax highlighting.

- Updated dependencies [[`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712), [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712), [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712), [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712)]:
  - @tumaet/apollon@5.1.1
