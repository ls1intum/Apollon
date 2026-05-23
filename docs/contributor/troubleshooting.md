---
id: troubleshooting
title: Troubleshooting
description: Recovery steps for the common Apollon contributor / self-host problems.
---

# Troubleshooting

> Aimed at contributors and self-hosters. The hosted webapp has no setup you can break.

## Wrong Node.js version

```sh
nvm use
```

Picks up the version pinned in `.nvmrc`.

## Build fails after a dependency change

Escalate in this order — only go further if the previous step doesn't fix it:

1. **Reinstall from the existing lockfile** (safe — preserves the version graph everyone else uses):

   ```sh
   pnpm install --frozen-lockfile
   ```

2. **Wipe `node_modules` and reinstall** (still safe, lockfile preserved):

   ```sh
   rm -rf node_modules **/node_modules
   pnpm install --frozen-lockfile
   ```

3. **Last resort — regenerate the lockfile** (changes dependencies; commit the result for review):

   ```sh
   rm -rf node_modules **/node_modules pnpm-lock.yaml
   pnpm install
   ```

Run all of the above from the monorepo root so pnpm workspaces resolve correctly.

## Docker ports in use

`pnpm dev` resolves port collisions automatically. For direct `docker compose` commands, stop whatever is holding the port and retry:

```sh
docker compose -f ./docker/compose.local.yml down
docker compose -f ./docker/compose.local.yml up --build
```

## Capacitor (iOS / Android) mobile build fails

Install Xcode (iOS) or Android Studio (Android), then re-sync:

```sh
pnpm build
pnpm capacitor:sync
```
