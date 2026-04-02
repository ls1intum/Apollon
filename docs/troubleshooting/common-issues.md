# Troubleshooting

Common issues and their solutions when working with the Apollon monorepo.

## Node.js Version Issues

**Problem:** Encountering issues with Node.js versions or npm compatibility.

**Solution:** Ensure you have the correct version installed by running:

```bash
nvm use
```

This will automatically switch to the Node.js version specified in the `.nvmrc` file.

## Package Build Failures

**Problem:** A package fails to build during the build process.

**Solution:** Check the individual `package.json` for specific build scripts and dependencies. You can also try:

1. Clean install dependencies:

   ```bash
   rm -rf node_modules
   npm install
   ```

2. Build packages individually:
   ```bash
   cd standalone/server
   npm run build
   ```

## Workspace Dependencies

**Problem:** Dependencies not resolving correctly in the monorepo.

**Solution:** Make sure you're running npm commands from the root of the monorepo to take advantage of npm workspaces.

## Docker Issues

**Problem:** Docker containers not starting or building correctly.

**Solution:**

1. Make sure Docker is running
2. Check if ports are already in use
3. Try rebuilding the containers:
   ```bash
   docker compose -f ./docker/compose.local.yml down
   docker compose -f ./docker/compose.local.yml build --no-cache
   docker compose -f ./docker/compose.local.yml up -d
   ```

## Environment Variables

**Problem:** Application not working due to missing environment variables.

**Solution:** Make sure you have created `.env` files based on the `.env.example` files in:

- `standalone/webapp/`
- `standalone/server/`

## Mobile Development Issues

**Problem:** Capacitor commands failing or mobile apps not building.

**Solution:**

1. Make sure you have the required mobile development tools installed (Xcode for iOS, Android Studio for Android)
2. Sync Capacitor files:
   ```bash
   npm run capacitor:sync
   ```
3. Clean and rebuild:
   ```bash
   npm run build
   npm run capacitor:sync
   ```
