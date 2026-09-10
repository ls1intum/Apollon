# Apollon for IntelliJ IDEA / WebStorm — developer guide

Build, run, and release notes for the [Apollon JetBrains plugin](./README.md). User-facing docs live in [`README.md`](./README.md).

## Layout

A Gradle project plus one pnpm workspace, mirroring the [VS Code extension](../vscode-extension)'s split between host and canvas:

- [`src/main/kotlin/de/tum/cit/aet/apollon/`](./src/main/kotlin/de/tum/cit/aet/apollon) — the plugin host (Kotlin, IntelliJ Platform SDK):
  - `editor/` — `ApollonFileEditorProvider` + `ApollonFileEditor`, the `FileEditor` that hosts a JCEF browser loading the webview bundle, plus `ApollonWebviewRequestHandler` (serves that bundle over `http://apollon.localhost/` — JCEF has no supported way for a plugin to register a real custom scheme) and `ApollonSaveListener` (flushes pending edits and drives auto-export on save).
  - `document/` — `DiagramDocument.kt` (parse/scaffold/rewrite the `.apollon` JSON, including the legacy VS-Code-wrapped format) and `DocumentSync.kt` (debounced two-way sync between the canvas and the IntelliJ `Document`).
  - `protocol/` — the Kotlin side of the host↔webview message contract (`Protocol.kt`) and the diagram-type catalog (`DiagramTypes.kt`); kept in step with `webview/src/shared/`.
  - `export/` — `DiagramExporter`, the request/response bookkeeping for rendering a diagram to a sibling SVG/PNG.
  - `theme/` — `ThemeBridge.kt`, sampling the IDE's editor color scheme + Swing LaF into the `--apollon-*` CSS custom properties the canvas reads.
  - `actions/`, `toolwindow/`, `settings/` — the `Tools > Apollon` menu, the diagram list tool window, and the auto-export project setting.
- [`webview/`](./webview) — `@tumaet/jetbrains-webview`, the canvas that hosts the `@tumaet/apollon` editor (Vite). `src/shared/` mirrors the host's `protocol/` types; `jcefBridge.ts` and `theme.ts` replace the VS Code webview's `acquireVsCodeApi()`/`--vscode-*` equivalents with the JCEF `window.__apollonPostToHost`/`window.__apollonReceiveFromHost` bridge and `document.documentElement.dataset.theme`.

There is no shared TypeScript package between `vscode-extension/webview` and this one — the protocols are structurally similar but evolve independently; check both when changing the message contract.

## Install dependencies

From the monorepo root:

```sh
pnpm install
```

## Build the webview bundle

The Gradle build does not shell out to pnpm itself — build the webview first, the same way CI does:

```sh
pnpm run build:jetbrains
```

This writes `webview/dist`, which `copyWebviewAssets` (a Gradle `Sync` task, wired into `processResources`) copies into `src/main/resources/webview` for `ApollonWebviewRequestHandler` to serve from the classpath at runtime.

## Run locally

```sh
cd jetbrains-plugin
./gradlew runIde
```

This launches a sandboxed IntelliJ IDEA Community instance with the plugin installed. Open or create a `.apollon` file to load the canvas. Re-run `pnpm run build:jetbrains` and restart `runIde` after a webview change; Kotlin changes only need `runIde` re-run.

## Checks

```sh
cd jetbrains-plugin
./gradlew verifyPluginProjectConfiguration   # sanity-checks the Gradle/plugin config itself
./gradlew test                               # JUnit 4 unit tests (document parsing/rewriting)
./gradlew buildPlugin                        # assembles build/distributions/*.zip
./gradlew verifyPlugin                       # IntelliJ Plugin Verifier against the recommended IDEs for sinceBuild..untilBuild
```

`verifyPlugin` fails only on `COMPATIBILITY_PROBLEMS`, `INVALID_PLUGIN`, `MISSING_DEPENDENCIES`, or `NOT_DYNAMIC` — see the comment above `pluginVerification` in `build.gradle.kts` for why deprecated/experimental/internal API usage is reported but not gated (it comes from implementing `ToolWindowFactory`, whose own interface methods are marked that way, independent of anything this plugin's code does).

For the webview:

```sh
pnpm --filter @tumaet/jetbrains-webview run typecheck
pnpm --filter @tumaet/jetbrains-webview run lint
pnpm --filter @tumaet/jetbrains-webview run build
```

`GRADLE_USER_HOME` matters if the default (`~/.gradle`) isn't writable or has limited space — set it before invoking `./gradlew` in that case.

## Release

The plugin shares Apollon's fixed version group (`.changeset/config.json`), so Changesets bumps `package.json` here alongside the library and the other standalone apps — `jetbrains-plugin/package.json` is a version carrier only; the actual build is Gradle/Kotlin. Record user-visible work with `pnpm changeset` like anywhere else in the repo (scope: `jetbrains`).

`Release JetBrains Plugin` (`.github/workflows/release-jetbrains-plugin.yml`) fires on a `jetbrains-plugin/package.json` version change, builds the webview + plugin ZIP, runs `verifyPlugin`, and — when `JETBRAINS_MARKETPLACE_TOKEN` and the signing secrets are configured — signs and publishes to the JetBrains Marketplace. Until then it runs in build+verify-only mode and still attaches the ZIP to a GitHub Release, matching how `Release VS Code Extension` behaves before its own Marketplace credentials existed.

Change notes shown on the Marketplace listing are generated from this package's `CHANGELOG.md` (via `scripts/extract-changelog.mjs`, the same script the other release workflows use for GitHub Release bodies) and passed to Gradle as `-PpluginChangeNotes=...`; a local `buildPlugin` without that property falls back to a link to the changelog file.
