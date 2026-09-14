# Architect Studio for IntelliJ IDEA / WebStorm — developer guide

Build, run, and release notes for the [Architect Studio JetBrains plugin](./README.md). User-facing docs live in [`README.md`](./README.md). Package ID and internal class names still say `apollon` throughout — that's an implementation detail, not something the rebrand touched (see the module dependency `de.tum.cit.aet.apollon` in `plugin.xml`); only user-visible text says "Architect Studio".

## Layout

A Gradle project plus one pnpm workspace, mirroring the [VS Code extension](../vscode-extension)'s split between host and canvas:

- [`src/main/kotlin/de/tum/cit/aet/apollon/`](./src/main/kotlin/de/tum/cit/aet/apollon) — the plugin host (Kotlin, IntelliJ Platform SDK):
  - `editor/` — the `FileEditor` layer. `ApollonCanvasHost` owns one JCEF browser running the webview bundle (message bridge, theme push, asset serving via `ApollonWebviewRequestHandler`, which serves it over `http://apollon.localhost/` because JCEF has no supported way for a plugin to register a real custom scheme). Two editors sit on top of it: `ApollonFileEditor` for a `.apollon` file, and `PumlCanvasFileEditor` for the **Edit** tab of a `.puml`. `PlantUmlPreviewFileEditor` is the **View** tab. `ApollonSaveListener` flushes pending canvas edits before a save and drives auto-export.
    A `.puml` gets three tabs because three providers accept it: `PlantUmlPreviewFileEditorProvider` (View) and `PumlCanvasFileEditorProvider` (Edit) are both `PLACE_BEFORE_DEFAULT_EDITOR`, so they sort ahead of the platform text editor, and the platform breaks the tie between them with `WeighedFileEditorProvider.getWeight()`. The first tab is also the default for a file with no remembered choice — hence View, which is read-only and works for every diagram family.
  - `document/` — `DiagramDocument.kt` (parse/scaffold/rewrite the `.apollon` JSON, including the legacy VS-Code-wrapped format), `DocumentSync.kt` (debounced two-way sync between the canvas and a `.apollon` `Document`), `PumlDocumentBridge.kt` (the same job for a `.puml` `Document`, with an import on the way in and an export on the way out), and `AtomicFiles.kt` (temp-file-then-rename writes for generated siblings).
    There is no working copy: the canvas is bound to the `.puml` file itself, so dirty state, undo, save and external-change detection are all the platform's. A node drag re-exports to byte-identical PlantUML and therefore never touches the document — the layout sidecar is what records it.
  - `puml/` — the PlantUML ↔ Apollon converter, deliberately IDE-free (no `com.intellij` import) so it's unit-testable without a platform test fixture: `PlantUmlImporter`/`PlantUmlExporter` (text ↔ `PumlDiagram`, see `PumlModel.kt`), `PumlResidual` (everything about the source text the canvas can't represent — comments, notes, unrecognised syntax, the exact keyword/arrow-token spelling — carried losslessly so a save never discards it), `ApollonModelMapper` (`PumlDiagram` ↔ the Apollon `UMLModel` JSON, merging a re-import onto a previous model by element name so canvas layout survives), `PumlLayoutSidecar` (the geometry PlantUML cannot express, in a committed `*.puml.layout.json` next to the source — it rebuilds a stand-in "previous model" so the merge above does the work and no mapper needs to know it exists), `RoundTripValidator` (the gate before any `.puml` overwrite: re-parse the candidate text and check it still agrees with the model), and `PumlMemberText`/`PumlEndLabels`/`PumlArrows`/`PumlLayout` (the smaller grammar/geometry pieces those lean on).
  - `protocol/` — the Kotlin side of the host↔webview message contract (`Protocol.kt`) and the diagram-type catalog (`DiagramTypes.kt`); kept in step with `webview/src/shared/`.
  - `export/` — `DiagramExporter`, the request/response bookkeeping for rendering a diagram to a sibling SVG/PNG.
  - `theme/` — `ThemeBridge.kt`, sampling the IDE's editor color scheme + Swing LaF into the `--apollon-*` CSS custom properties the canvas reads.
  - `actions/`, `toolwindow/`, `settings/` — the `Tools > Architect Studio` menu, the diagram list tool window (`.apollon` and PlantUML files alike), and the auto-export project setting.
- [`webview/`](./webview) — `@tumaet/jetbrains-webview`, the canvas that hosts the `@tumaet/apollon` editor (Vite). `src/shared/` mirrors the host's `protocol/` types; `jcefBridge.ts` and `theme.ts` replace the VS Code webview's `acquireVsCodeApi()`/`--vscode-*` equivalents with the JCEF `window.__apollonPostToHost`/`window.__apollonReceiveFromHost` bridge and `document.documentElement.dataset.theme`.

There is no shared TypeScript package between `vscode-extension/webview` and this one — the protocols are structurally similar but evolve independently; check both when changing the message contract.

### PlantUML round-trip architecture

```
                    .puml  ── one IntelliJ Document ──┬── View  (PlantUmlRenderService -> SVG)
                      ▲                               ├── Text  (platform text editor)
                      │                               └── Edit  (the canvas, below)
                      │
   PumlDocumentBridge │  import: PlantUmlDiagramImporter.parse()
                      │  export: PlantUmlDiagramExporter.render()  [RoundTripValidator gates it]
                      ▼
   PumlDiagram + PumlResidual ──<Family>ModelMapper── Apollon UMLModel JSON (the canvas)
                                        ▲
                       *.puml.layout.json (positions, sizes, waypoints, colours)
```

`PumlDocumentBridge` is the only class in this feature that touches IntelliJ Platform APIs; everything under `puml/` is pure Kotlin, so the converter, the merge and the layout sidecar are tested directly without a platform test fixture. A save never touches the `.puml` until `RoundTripValidator` confirms the regenerated text re-parses back to the same elements and relationships the model has; if it doesn't, the document is left alone and the user gets an error balloon telling them to undo.

Two things do not survive a trip through PlantUML, and are handled differently on purpose. **Residual** (`PumlResidual` — preamble, unsupported lines, exact arrow/keyword spelling) is entirely re-derived from the source text on every import, so it lives in memory and is never persisted. **Geometry** cannot be re-derived, so it goes to a committed `*.puml.layout.json` sibling; `PumlLayoutSidecar.toPreviousModel()` turns it back into the shape the mappers' existing name-keyed merge already understands, which is why no mapper has any knowledge of it.

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

This writes `webview/dist`, which `copyWebviewAssets` (a Gradle `Sync` task, wired into `processResources`) copies into `src/main/resources/webview` for `ApollonWebviewRequestHandler` to serve from the classpath at runtime. Because it is wired into `processResources`, every Gradle task that builds the plugin — `runIde` included — picks up a fresh `webview/dist` on its own; there is never a copy step to run by hand.

**`build:jetbrains` does not rebuild the library.** The webview resolves `@tumaet/apollon` through its `exports` map to `library/dist/index.js`, not to `library/lib/` sources, so a change under `library/lib/` is invisible until the library itself is rebuilt — the canvas silently keeps running the previous bundle. After touching the library:

```sh
pnpm build:lib && pnpm run build:jetbrains
```

## Run locally

```sh
cd jetbrains-plugin
./gradlew runIde
```

This launches a sandboxed IntelliJ IDEA Community instance with the plugin installed. Open or create a `.apollon` file to load the canvas.

What to re-run depends on what you changed:

| Changed                     | Command                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| Kotlin only                 | `./gradlew runIde`                                               |
| `jetbrains-plugin/webview/` | `pnpm run build:jetbrains && ./gradlew runIde`                   |
| `library/`                  | `pnpm build:lib && pnpm run build:jetbrains && ./gradlew runIde` |

When in doubt the last row is always correct. If the canvas comes up blank or stale, check the IDE log (`.intellijPlatform/sandbox/*/log/idea.log`) — the webview's JS console and any failed asset load are mirrored there by `ApollonCanvasHost`.

## Checks

```sh
cd jetbrains-plugin
./gradlew verifyPluginProjectConfiguration   # sanity-checks the Gradle/plugin config itself
./gradlew test                               # JUnit 4 unit tests (document parsing/rewriting, puml/)
./gradlew buildPlugin                        # assembles build/distributions/*.zip
./gradlew verifyPlugin                       # IntelliJ Plugin Verifier against the recommended IDEs for sinceBuild..untilBuild
```

`verifyPlugin` fails only on `COMPATIBILITY_PROBLEMS`, `INVALID_PLUGIN`, `MISSING_DEPENDENCIES`, or `NOT_DYNAMIC` — see the comment above `pluginVerification` in `build.gradle.kts` for why deprecated/experimental/internal API usage is reported but not gated (it comes from implementing `ToolWindowFactory`, whose own interface methods are marked that way, independent of anything this plugin's code does).

`./gradlew buildPlugin` also runs `buildSearchableOptions`, which launches a headless IDE with the built plugin to harvest `Configurable` search terms — that needs a real (or virtual) display and working JCEF; in a display-less/JCEF-less container it fails with `Plugin 'Architect Studio' ... has module dependency 'intellij.platform.ui.jcef' which cannot be loaded`. That's an environment limitation, not a build error: run `./gradlew buildPlugin -x buildSearchableOptions` there instead, which still produces a complete, installable `build/distributions/*.zip`.

The PlantUML converter (`puml/`) is covered by `PlantUmlImporterTest`, `PlantUmlExporterTest`, `PumlMemberTextTest`, `EndLabelTest`, `ApollonModelMapperTest`, `DiagramTypeDetectorTest`, the per-family `*RoundTripTest`s, `RoundTripValidatorTest`, `PumlLayoutSidecarTest`, and `AtomicFilesTest` — all pure JUnit 4, no platform test fixture needed, since none of those classes import `com.intellij.*`.

### Manually verifying the PlantUML workflow

`./gradlew test` covers the converter and workspace logic; the IDE integration itself (context menu, tool window, JCEF canvas) needs a `runIde` pass:

1. `pnpm run build:jetbrains && cd jetbrains-plugin && ./gradlew runIde`, then open a project containing a `.puml` file such as:
   ```plantuml
   @startuml
   class Customer {
     -name : String
     +placeOrder()
   }
   class Order
   Customer "1" --> "*" Order
   @enduml
   ```
2. Open the file. Confirm it comes up on **View** with a rendered diagram, and that the tab strip along the bottom reads **View | Edit | Text** in that order.
3. Switch to **Edit**. Confirm the canvas shows `Customer` and `Order` and the `1`/`*` association between them.
4. Move a node, then switch to **Text**: the PlantUML should be unchanged (positions aren't PlantUML), but an `example.puml.layout.json` should have appeared next to the file. Delete it and reopen to confirm the canvas falls back to an automatic layout.
5. Add an attribute on the canvas, then switch to **Text** without saving: the new member should already be in the buffer, and `Ctrl+Z` should undo it. Save, and confirm the `.puml` on disk matches.
6. Type a new `class Invoice` into **Text**, then switch back to **Edit**: it should be on the canvas. Confirm no balloon warns about an external change — there is only one document now.
7. Open a native `.apollon` file and confirm New/Export/tool-window/auto-export all still behave exactly as before — this feature must not regress them.

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
