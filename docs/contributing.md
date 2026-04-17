# Contributing

Contributions are welcome. The steps below are the short version; the root [README](../README.md) covers repo setup.

## Flow

1. Fork the repo, then branch off `main`:

   ```sh
   git checkout -b feature/<short-name>
   ```

2. Make your change. Keep to the existing TypeScript + React conventions; Prettier and ESLint are authoritative.

3. Verify locally:

   ```sh
   npm run lint
   npm run test
   npm run build
   ```

4. Commit with a [conventional commits](https://www.conventionalcommits.org/) prefix (`commitlint.config.mjs` enforces this):

   ```sh
   git commit -m "feat: <what changed>"
   ```

5. Push your branch and open a pull request against `main`.

## Releases

Releases are dispatch-and-merge; see [Releases](deployment/npm-publishing.md).
