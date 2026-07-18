<div align="center">

# Apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm downloads](https://img.shields.io/npm/dm/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](./LICENSE)

**Open-source UML modeling editor for the web.** Draw 13 UML and modeling diagram types (class, component, activity, BPMN, SFC, and more) in the browser, collaborate in real time, and export to SVG, PNG, PDF, or JSON.

[**▶ Try the live demo**](https://apollon.aet.cit.tum.de) · [Documentation](https://ls1intum.github.io/Apollon/) · [npm package](https://www.npmjs.com/package/@tumaet/apollon) · [VS Code extension](https://marketplace.visualstudio.com/items?itemName=aet-tum.apollon-extension)

<a href="https://apollon.aet.cit.tum.de">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/static/img/apollon-editor-dark.png" />
    <img src="docs/static/img/apollon-editor-light.png" alt="The Apollon editor showing a UML class diagram, with the element palette on the left and the app chrome on top" />
  </picture>
</a>

</div>

## Why Apollon

- **Made for learning and teaching.** Apollon powers the UML modeling exercises and grading workflows in [Artemis](https://artemis.tum.de/), TUM's interactive learning platform, and holds up in large university courses — but it is a general-purpose editor that works just as well outside the classroom.
- **Embeddable first.** The editor is an npm library with an imperative API (plus a React component); the standalone web app and the VS Code extension in this repo are built on top of it. If you need diagramming inside your own product, you embed the exact editor you see in the demo.
- **Framework-agnostic.** One API works from Angular, Vue, Svelte, vanilla JS, or React.
- **Real-time collaboration built in.** Opt-in multi-user editing over [Yjs](https://yjs.dev/), with any transport you like.
- **MIT-licensed and self-hostable.** No account, no cloud dependency — run the whole stack yourself.

## What's in this repo

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
| Server        | Hono 4, Redis (RedisJSON), WebSocket relay                           |
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
