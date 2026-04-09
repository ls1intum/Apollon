# Apollon

Welcome to the Apollon Monorepo! This repository uses **npm workspaces** to manage multiple packages (including a server, webapp, and library) in a single codebase.

## Quick Start

```bash
# Clone the repository
git clone git@github.com:ls1intum/Apollon.git
cd Apollon

# Use correct Node.js version
nvm install && nvm use

# Install dependencies
npm install

# Build all packages
npm run build

# Start dev stack with hot reload
npm run dev
```

This starts:
- **Library** build watch (auto-rebuilds on changes)
- **Server** (tsx watch) on a printed local HTTP port with a matching WebSocket relay port
- **Webapp** (Vite HMR) on a printed local dev URL

`npm run dev` also handles local port collisions for the webapp, server, WebSocket relay, and Redis. It reuses an existing local Redis when possible and otherwise starts the local Redis container on a free host port. Docker still needs to be available when no compatible local Redis is already running.

If you need to pin preferred ports, set `APOLLON_WEBAPP_PORT`, `APOLLON_SERVER_PORT`, `APOLLON_WS_PORT`, or `APOLLON_REDIS_PORT` before running `npm run dev`.

No `.env` files needed — defaults match the local setup.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Library | React, TypeScript, React Flow, Yjs (CRDT), Zustand, Vite |
| Server | Express 5, Redis (RedisJSON), WebSocket relay |
| Webapp | React, TypeScript, Vite, MUI, Tailwind |
| Database | Redis with RedisJSON (diagrams expire after 120 days via native TTL) |
| Reverse Proxy | Caddy (production) |

## Documentation

For complete documentation, setup instructions, and guides, visit:

**[https://apollon.readthedocs.io/en/latest/](https://apollon.readthedocs.io/en/latest/)**

- [Getting Started](https://apollon.readthedocs.io/en/latest/getting-started/requirements.html) - Requirements and setup
- [Development](https://apollon.readthedocs.io/en/latest/development/project-structure.html) - Project structure and workflow
- [Mobile Development](https://apollon.readthedocs.io/en/latest/mobile/ios-android-setup.html) - iOS and Android with Capacitor
- [Deployment](https://apollon.readthedocs.io/en/latest/deployment/github-actions.html) - GitHub Actions and Docker Compose
- [Troubleshooting](https://apollon.readthedocs.io/en/latest/troubleshooting/common-issues.html) - Common issues

## Requirements

- **Node.js** (version specified in `.nvmrc`)
- **npm** 7+ (for workspace support)
- **Docker** (for running Redis locally via `npm run dev` or `npm run start:localdb`)

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://apollon.readthedocs.io/en/latest/contributing.html) for detailed instructions.
