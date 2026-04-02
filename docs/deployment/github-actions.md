# GitHub Actions

Deployment is through [GitHub Action triggers](https://github.com/ls1intum/Apollon/actions/workflows/deploy-prod.yml).

Click on "Run workflow" dropdown and select the main branch, then run the workflow.

## Run Docker Locally

Make sure Docker is up and running.

### Build and Run with Docker Compose

1. **Start local Redis database:**

   ```bash
   docker compose -f ./docker/compose.local.db.yml up -d
   ```

2. **Build and run all services:**

   ```bash
   docker compose -f ./docker/compose.local.yml up --build
   ```

   The webapp will be available at `http://localhost:8080`.

## Available Docker Compose Files

The project uses a 3-file split architecture for production:

| File | Purpose | Lifecycle |
|------|---------|-----------|
| `docker/compose.proxy.yml` | Caddy reverse proxy | Deployed once, stays up during app deploys |
| `docker/compose.db.yml` | Redis database | Deployed once, stays up during app deploys |
| `docker/compose.app.yml` | Server + Webapp | Deployed via CI/CD on every merge |

For local development:

| File | Purpose |
|------|---------|
| `docker/compose.local.yml` | All services (builds from source) |
| `docker/compose.local.db.yml` | Redis only (for running server outside Docker) |
