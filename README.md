# Apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](./LICENSE)

Apollon is an open-source UML modeling editor for the web. Draw 13 UML and modeling diagram types (class, component, activity, BPMN, SFC, and more) in the browser, collaborate in real time, and export to SVG, PNG, PDF, or JSON.

This monorepo contains every piece of the Apollon platform:

- **[`library/`](./library)**: the embeddable `@tumaet/apollon` editor ([npm](https://www.npmjs.com/package/@tumaet/apollon)).
- **[`standalone/`](./standalone)**: the standalone web app (server and webapp) built on the library.
- **[`vscode-extension/`](./vscode-extension)**: the Apollon VS Code extension.
- **[`docs/`](./docs)**: the Docusaurus documentation site, published at <https://ls1intum.github.io/Apollon/>.

## Use the library

```sh
npm install @tumaet/apollon react react-dom @xyflow/react yjs y-protocols
```

`react`, `react-dom`, `@xyflow/react`, `yjs`, and `y-protocols` are required
peer dependencies — the editor renders on the host's single React and Yjs
instance instead of bundling its own. See the
[library README](./library/README.md) for the full API and per-framework guides.

## Run the stack locally

```sh
git clone git@github.com:ls1intum/Apollon.git
cd Apollon
nvm install && nvm use
pnpm install
pnpm dev
```

`pnpm dev` starts three processes together:

- Library build watch (auto-rebuilds on changes).
- Server (`tsx watch`) on a printed local HTTP port with a matching WebSocket relay port.
- Webapp (Vite HMR) on a printed local dev URL.

The launcher handles the setup:

- Resolves port collisions for the webapp, server, WebSocket relay, and Redis.
- Reuses an existing local Redis if one is running; otherwise it starts a Redis container on a free host port (Docker is only required in that case).
- Needs no `.env` files. The defaults match the local setup.

Override ports via `APOLLON_WEBAPP_PORT`, `APOLLON_SERVER_PORT`, `APOLLON_WS_PORT`, or `APOLLON_REDIS_PORT`.

To preview the documentation site instead, run `pnpm dev:docs` from the repo root. It builds the library and starts the Docusaurus dev server.

## Tech stack

| Component     | Technology                                                           |
| ------------- | -------------------------------------------------------------------- |
| Library       | React, TypeScript, React Flow (`@xyflow/react`), Yjs, Zustand, Vite  |
| Server        | Express 5, Redis (RedisJSON), WebSocket relay                        |
| Webapp        | React, TypeScript, Vite, shadcn-style UI (Base UI), Tailwind         |
| Storage       | Redis with RedisJSON (diagrams expire after 120 days via native TTL) |
| Reverse proxy | Traefik v3 (production)                                              |

## Requirements

- **Node.js**: version pinned in [`.nvmrc`](./.nvmrc) (Node 24 LTS).
- **pnpm 11+**: the package manager. The exact version is pinned in the `packageManager` field of `package.json`. Install it with `npm install -g pnpm@11`.
- **Docker**: only when `pnpm dev` needs to start a local Redis.

## Documentation

The docs are a [Docusaurus](https://docusaurus.io/) site published at <https://ls1intum.github.io/Apollon/>. Sources live in [`docs/`](./docs); preview them locally with `pnpm dev:docs`.

- [Library](https://ls1intum.github.io/Apollon/library/): embedding the `@tumaet/apollon` editor.
- [User Guide](https://ls1intum.github.io/Apollon/user/): getting started, requirements, and self-hosting.
- [Contributor](https://ls1intum.github.io/Apollon/contributor/): project structure, scripts, deployment, and troubleshooting.

Operations, legal pages, and TUM DSMS material live in [`ops/`](./ops) in this repo.

## Contributing

Open an issue or a pull request at <https://github.com/ls1intum/Apollon>. Guidelines live in [`CONTRIBUTING.md`](./CONTRIBUTING.md); see also the [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## License

MIT. See [LICENSE](./LICENSE).
