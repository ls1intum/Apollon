# Apollon2 Re-Engineering

Welcome to the Apollon2 Monorepo! This repository uses **npm workspaces** to manage multiple packages (including a server, webapp, and library) in a single codebase.

## Quick Start

```bash
# Clone the repository
git clone git@github.com:ls1intum/Apollon2.git
cd Apollon2

# Use correct Node.js version
nvm install && nvm use

# Install dependencies
npm install

# Build all packages
npm run build

# Start Redis (requires Docker)
npm run start:localdb

# Start dev stack with hot reload
npm run dev
```

This starts:
- **Library** build watch (auto-rebuilds on changes)
- **Server** (tsx watch) on http://localhost:8000 with WebSocket relay on ws://localhost:4444
- **Webapp** (Vite HMR) on http://localhost:5173

No `.env` files needed — defaults match the local setup.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Library | React, TypeScript, React Flow, Yjs (CRDT), Zustand, Vite |
| Server | Express 5, Redis (RedisJSON), WebSocket relay |
| Webapp | React, TypeScript, Vite, MUI, Tailwind |
| Database | Redis with RedisJSON (diagrams expire after 60 days via native TTL) |
| Reverse Proxy | Caddy (production) |

## Documentation

For complete documentation, setup instructions, and guides, visit:

**[https://apollon2.readthedocs.io/en/latest/](https://apollon2.readthedocs.io/en/latest/)**

- [Getting Started](https://apollon2.readthedocs.io/en/latest/getting-started/requirements.html) - Requirements and setup
- [Development](https://apollon2.readthedocs.io/en/latest/development/project-structure.html) - Project structure and workflow
- [Mobile Development](https://apollon2.readthedocs.io/en/latest/mobile/ios-android-setup.html) - iOS and Android with Capacitor
- [Deployment](https://apollon2.readthedocs.io/en/latest/deployment/github-actions.html) - GitHub Actions and Docker Compose
- [Troubleshooting](https://apollon2.readthedocs.io/en/latest/troubleshooting/common-issues.html) - Common issues

## Requirements

- **Node.js** (version specified in `.nvmrc`)
- **npm** 7+ (for workspace support)
- **Docker** (for running Redis locally)

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://apollon2.readthedocs.io/en/latest/contributing.html) for detailed instructions.
