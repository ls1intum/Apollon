# Troubleshooting

## Wrong Node.js version

```sh
nvm use
```

Picks up the version pinned in `.nvmrc`.

## Build fails after a dependency change

```sh
rm -rf node_modules package-lock.json
npm install
```

Run from the monorepo root so npm workspaces resolve correctly.

## Docker ports in use

`npm run dev` resolves port collisions automatically. For direct `docker compose` commands, stop whatever is holding the port and retry:

```sh
docker compose -f ./docker/compose.local.yml down
docker compose -f ./docker/compose.local.yml up --build
```

## Capacitor (iOS / Android) mobile build fails

Install Xcode (iOS) or Android Studio (Android), then re-sync:

```sh
npm run build
npm run capacitor:sync
```
