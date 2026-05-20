# Requirements

Ensure you have the following installed:

## Node.js

The required Node.js version is pinned in `.nvmrc` (Node 24 LTS).

Use [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) to install/manage Node versions:

```bash
brew install nvm
```

Then, load `nvm` into your shell:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && \. "/usr/local/opt/nvm/nvm.sh"
```

Once `nvm` is set up:

```bash
nvm install
nvm use
```

## pnpm

Apollon uses [pnpm workspaces](https://pnpm.io/workspaces). The exact pnpm version is pinned in `package.json` via the `packageManager` field.

Install pnpm globally:

```bash
npm install -g pnpm@11
```

Verify your pnpm version:

```bash
pnpm -v
```

## Docker

Docker is required to run Redis locally for development.

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your platform.
