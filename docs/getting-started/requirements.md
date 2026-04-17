# Requirements

Ensure you have the following installed:

## Node.js

The required Node.js version is pinned in `.nvmrc`.

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

## npm

Apollon uses npm workspaces, which require npm 7 or newer.

npm comes with Node.js. Verify your npm version:

```bash
npm -v
```

## Docker

Docker is required to run Redis locally for development.

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your platform.

## Verifying Versions

After setup, verify that you have the correct versions installed:

- **Node.js:**
  ```bash
  node -v
  ```
  This should match the version specified in the `.nvmrc` file.
