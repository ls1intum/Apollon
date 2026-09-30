# Architect Studio for IntelliJ IDEA / WebStorm — developer guide

Build, run, and release notes for the [Architect Studio JetBrains plugin](./README.md). User-facing docs live in [`README.md`](./README.md). Package ID and internal class names still say `apollon` throughout — that's an implementation detail, not something the rebrand touched (see the module dependency `de.tum.cit.aet.apollon` in `plugin.xml`); only user-visible text says "Architect Studio".

## Layout

A Gradle project plus one pnpm workspace, mirroring the [VS Code extension](../vscode-extension)'s split between host and canvas:

- [`src/main/kotlin/de/tum/cit/aet/apollon/`](./src/main/kotlin/de/tum/cit/aet/apollon) — the plugin host (Kotlin, IntelliJ Platform SDK):
  - `editor/` — the `FileEditor` layer. `ApollonCanvasHost` owns one JCEF browser running the webview bundle (message bridge, theme push, asset serving via `ApollonWebviewRequestHandler`, which serves it over `http://apollon.localhost/` because JCEF has no supported way for a plugin to register a real custom scheme). Two editors sit on top of it: `ApollonFileEditor` for a `.apollon` file, and `PumlCanvasFileEditor` for the **Edit** tab of a `.puml`. `PumlSplitFileEditor` is the **View** tab. `ApollonSaveListener` flushes pending canvas edits before a save and drives auto-export.
    `PumlSplitFileEditor` is a platform `TextEditorWithPreview`: the file's own text editor on one side, `PlantUmlPreviewFileEditor`'s render on the other, with the Editor / Split / Preview switch the bundled Markdown plugin also uses. It opens split, and `TextEditorWithPreview` remembers a different choice application-wide in `PropertiesComponent` keyed by the tab's name; `PlantUmlPreviewFileEditorProvider.readState`/`writeState` make that (and the source pane's caret) per-file in the workspace file as well. `readState` leaves each field **null** when the workspace does not name it, because `TextEditorWithPreview.setState` skips a null rather than applying it — reading an absent layout as the default instead would silently override the application-wide choice on the first `.puml` anyone opens after updating, since no existing workspace entry has the attribute. The splitter proportion is overridden to a key of our own, because the base class's is the one string `TextEditorWithPreview.SplitterProportionKey` for every split editor in the IDE; the layout property key is `"${name}Layout"` and is `private final`, so ours is the fairly generic `ViewLayout` — shared with any other plugin that names a split editor "View", which would at worst change the layout a _new_ file starts in, never an existing one's.
    One thing to pick up at the next platform bump: `FileEditorProvider.readState(Element, Project, VirtualFile)` is not deprecated in the pinned 262 but is in 263, where a `readState(Element, Project, Lazy<VirtualFile>)` overload replaces it. That overload does not exist in 262, so it cannot be used yet — the Plugin Verifier reports the pair as two of its deprecated-API usages and the plugin as Compatible on both. The platform still dispatches to the old signature through `ReflectionUtil.hasOverriddenMethod`, so nothing is broken meanwhile. `TextEditorWithPreview.dispose()` disposes **both** halves itself, so `createEditor` must not also register either one as a child of anything. The provider deliberately keeps `PLACE_BEFORE_DEFAULT_EDITOR` rather than the `HIDE_DEFAULT_EDITOR` the platform's own `TextEditorWithPreviewProvider` returns: the source pane here is a companion to the render, not a replacement for the **Text** tab, which stays the full-width editor and stays the target of the canvas's `reopenAsText` (`setSelectedEditor(file, "text-editor")` — hiding the default editor would break it).
    `PlantUmlPreviewFileEditor` navigates its browser to a static shell page **once** and pushes every subsequent render into it with `executeJavaScript`, the way `ApollonCanvasHost` does — a second `JBCefBrowser.loadHTML()` silently no-ops, because it always navigates to the same `about:blank`-derived URL and `loadUrlImpl` early-returns when the URL matches the one already loading. Rendering itself runs on a pooled thread behind a sequence number, so a slow render can't block the EDT or overwrite a newer one. It also watches its own component for `componentHidden`/`componentShown` — `TextEditorWithPreview` hides the pane outright for its Editor-only layout, and that is the cheapest way to stop a PlantUML layout pass per keystroke into something nobody is looking at. Hiding only ever _defers_: the deferred render is issued on the way back in, so a missed event costs a stale pixel rather than a blank pane.
    A `.puml` gets three tabs because three providers accept it: `PlantUmlPreviewFileEditorProvider` (View) and `PumlCanvasFileEditorProvider` (Edit) are both `PLACE_BEFORE_DEFAULT_EDITOR`, so they sort ahead of the platform text editor, and the platform breaks the tie between them with `WeighedFileEditorProvider.getWeight()`. The first tab is also the default for a file with no remembered choice — hence View, which works for every diagram family.
  - `document/` — `DiagramDocument.kt` (parse/scaffold/rewrite the `.apollon` JSON, including the legacy VS-Code-wrapped format), `DocumentSync.kt` (debounced two-way sync between the canvas and a `.apollon` `Document`), `PumlDocumentBridge.kt` (the same job for a `.puml` `Document`, with an import on the way in and an export on the way out), and `AtomicFiles.kt` (temp-file-then-rename writes for generated siblings).
    There is no working copy: the canvas is bound to the `.puml` file itself, so dirty state, undo, save and external-change detection are all the platform's. A node drag re-exports to byte-identical PlantUML and therefore never touches the document — the layout sidecar is what records it.
  - `puml/` — the PlantUML ↔ Apollon converter, deliberately IDE-free (no `com.intellij` import) so it's unit-testable without a platform test fixture: `PlantUmlImporter`/`PlantUmlExporter` (text ↔ `PumlDiagram`, see `PumlModel.kt`), `PumlResidual` (everything about the source text the canvas can't represent — comments, notes, unrecognised syntax, the exact keyword/arrow-token spelling — carried losslessly so a save never discards it), `ApollonModelMapper` (`PumlDiagram` ↔ the Apollon `UMLModel` JSON, merging a re-import onto a previous model by element name so canvas layout survives), `PumlLayoutSidecar` (the geometry PlantUML cannot express, in a committed `*.puml.layout.json` next to the source — it rebuilds a stand-in "previous model" so the merge above does the work and no mapper needs to know it exists), `RoundTripValidator` (the gate before any `.puml` overwrite: re-parse the candidate text and check it still agrees with the model), `PumlAutoLayout` (the layered-with-grid-fallback arrangement: relationships ranked by longest path with back-edges stripped, one barycentre sweep to cut crossings, unconnected elements dropped into `PumlLayout.gridPositions` below — used for both a fresh import and the **Auto layout** command, so there is one arrangement rather than two), and `PumlMemberText`/`PumlEndLabels`/`PumlArrows`/`PumlLayout` (the smaller grammar/geometry pieces those lean on).
  - `protocol/` — the Kotlin side of the host↔webview message contract (`Protocol.kt`) and the diagram-type catalog (`DiagramTypes.kt`); kept in step with `webview/src/shared/`.
  - `export/` — `DiagramExporter`, the request/response bookkeeping for rendering a diagram to a sibling SVG/PNG.
  - `render/` — `PlantUmlRenderService` (the **View** tab's `.puml` → SVG, the one place that calls the bundled `plantuml-mit` engine; also IDE-free, hence unit-testable) and `C4MacroBundle`. PlantUML runs under the `ALLOWLIST` [security profile](https://plantuml.com/security), which is _narrower_ than `SANDBOX` here rather than wider: no URL is ever fetched (nothing sets `plantuml.allowlist.url`) and the directories on disk it may read are named by `plantuml.include.path` — the one `C4MacroBundle` extracts, plus whatever the `RenderContext` adds for the file being rendered.
    **Both of those switches are process-wide system properties, and neither is left set.** An IDE can have more than one plugin carrying its own PlantUML — **PlantUML integration** (`plantuml4idea`) is the common one — and each copy latches the profile from the property the first time it reads it. Leaving `PLANTUML_SECURITY_PROFILE` set took the network away from that plugin's preview, so every `!includeurl` in it came back "Cannot open URL"; leaving `plantuml.include.path` set made a plain `!include C4.puml` in someone's diagram resolve into our bundle. So the profile is set, read once to latch it into our own class loader, and cleared; the include path (which PlantUML re-reads per file, so it cannot be latched) is set for the length of a render under `renderLock` and put back in a `finally`. `no PlantUML setting is left behind for the rest of the IDE` and `concurrent renders still hand the JVM back unchanged` are the guards. There is no way to scope either property properly — PlantUML has no API for it — so a second plugin taking its _very first_ reading inside our microsecond window would still latch our profile. That directory holds the C4-PlantUML macros vendored under [`resources/c4/`](./src/main/resources/c4/README.md) — a C4 file's `!include` is repointed at them by `PlantUmlRenderService.withLocalC4Includes`, whether it was written as a GitHub URL, a relative path or PlantUML's `<C4/…>` stdlib spelling; a bare `!theme C4_united` gets the bundle's `themes/` appended as a `from` clause, since PlantUML's own `themes/` has none of C4's. `SANDBOX` cannot express that exception: it refuses every local read outright, which would leave `<C4/…>` (a resource lookup inside `plantuml-mit`, at whatever version it ships and subject to how the IDE's classloader serves it) as the only way to get the macros. Vendoring them makes the version explicit and the render reproducible offline. Each `C4_*.puml` picks between including its neighbour from disk and fetching it from GitHub on `%variable_exists("RELATIVE_INCLUDE")`, so the service defines that variable — drop it and C4 quietly starts reaching for the network again, which is what `the macro files include each other locally rather than over the network` guards.
    **A diagram's own `!include ../lib/house-style.puml` has to resolve too, and that needs a second switch besides the path.** `RenderContext` carries where the buffer came from — `baseDirectory`, the file's parent, and `allowedRoots`, the project's content roots — gathered on the EDT by `PlantUmlPreviewFileEditor.renderContext()` so `ProjectRootManager` is read with the source rather than off it. The roots are appended to `plantuml.include.path`, which makes the read _permitted_; `FileSystem.getInstance().setCurrentDir()` is pointed at the file's directory, which makes the relative path _resolve_. Either alone fails, with the same "cannot include …" the plugin used to show for any diagram that included a sibling — `plantuml.jar` on the command line gets the second one for free from the process's working directory, and a preview has no working directory. `currentDir` is a `ThreadLocal` on the same per-classloader singleton, so it is saved and put back like the properties (`the current directory is put back after a render`). Nested includes resolve against the including file's own directory, which PlantUML tracks itself, so `c4/a.puml` → `../lib/b.puml` → `./C4_Context.puml` needs nothing extra. PlantUML consults `currentDir` _before_ the include path, so a project that vendors its own C4-PlantUML gets its own copy rather than ours; `withLocalC4Includes` also declines to rewrite an include that exists next to the diagram, so the two agree (`the project's own C4 macros win over the bundled copy`).
    **The allow-list is a prefix test, and it does not stop a traversal.** `SFile.isInAllowList` compares cleaned path strings with `startsWith` and does not resolve `..`, so `!include ../../../../etc/hostname` from a file inside a content root reads that file and renders it into the preview. An absolute path outside the roots _is_ refused (`a diagram cannot read an absolute path outside the project`), and no URL is reachable either way. No PlantUML setting closes the gap — any entry permissive enough for the legitimate include is also a prefix permissive enough for the escape — so the behaviour is pinned by a canary test, `PlantUML's own allow-list does not stop a traversal out of the project`, rather than fixed; change the allow-listing and that test tells you whether you moved the boundary. Closing it properly means resolving the include graph ourselves and handing PlantUML one flattened buffer with no `!include` left in it. `BlockUml.getIncluded()` is not a shortcut to auditing it after the fact: it comes back empty for `SourceStringReader` sources, populated only on PlantUML's file-based reader path.
  - `theme/` — `ThemeBridge.kt`, sampling the IDE's editor color scheme + Swing LaF into the `--apollon-*` CSS custom properties the canvas reads.
  - `actions/`, `toolwindow/`, `settings/` — the `Tools > Architect Studio` menu, the diagram list tool window (`.apollon` and PlantUML files alike), and the auto-export project setting.
- [`webview/`](./webview) — `@tumaet/jetbrains-webview`, the canvas that hosts the `@tumaet/apollon` editor (Vite). `src/shared/` mirrors the host's `protocol/` types; `jcefBridge.ts` and `theme.ts` replace the VS Code webview's `acquireVsCodeApi()`/`--vscode-*` equivalents with the JCEF `window.__apollonPostToHost`/`window.__apollonReceiveFromHost` bridge and `document.documentElement.dataset.theme`.

There is no shared TypeScript package between `vscode-extension/webview` and this one — the protocols are structurally similar but evolve independently; check both when changing the message contract.

### PlantUML round-trip architecture

```
                    .puml  ── one IntelliJ Document ──┬── View  (source | PlantUmlRenderService -> SVG)
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

### Auto layout

The arrangement lives in `puml/PumlAutoLayout.kt` — host-side Kotlin, because that package is IDE-free and unit-tested, whereas `webview/` has no test runner.

**`arrange` has exactly one caller, and it is the user.** The canvas asks (`autoLayout`), the host arranges and answers (`applyLayout`). The canvas is the one that asks, from either trigger, because it holds the sizes the browser measured and any edit still inside the commit debounce; `AutoLayoutDiagramAction` therefore only sends `autoLayoutRequested` and lets it come back. Unlike `ExportDiagramAction`, the action accepts both `ApollonFileEditor` and `PumlCanvasFileEditor`.

Nothing else may call it — an import in particular must not. `importFrom` runs again on every external change to the document, and until the sidecar exists `toPreviousModel()` is `null` every time, so arranging there would re-arrange the diagram on each keystroke in the **Text** tab and throw away a position the user had just dragged. The cost of that rule is that a `.puml` with no sidecar opens on whatever grid the family mapper placed; the button is the answer to that, not an import-time rewrite. Once the user has arranged or moved anything, the sidecar exists and the mappers' name-keyed merge keeps every position across re-imports — new elements typed into **Text** park below what is already placed rather than disturbing it.

`App.tsx` applies the result through the reactive `model` prop and deliberately does _not_ update `lastSyncedJson`: the echo through `subscribeToModelChange` is what persists the new geometry (the sidecar for a `.puml`, the document for an `.apollon`), and going through the prop puts the change on the canvas's own Yjs undo stack, so `Ctrl+Z` restores the previous arrangement. `arrange` also resets each edge's `data.points` to `[]` and drops `sourceAnchor`/`targetAnchor` — a non-empty `points` is authoritative in the library's edge solver, so an edge would otherwise keep its old polyline projected onto the new endpoints.

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

The PlantUML converter (`puml/`) is covered by `PlantUmlImporterTest`, `PlantUmlExporterTest`, `PumlMemberTextTest`, `EndLabelTest`, `ApollonModelMapperTest`, `DiagramTypeDetectorTest`, the per-family `*RoundTripTest`s, `RoundTripValidatorTest`, `PumlLayoutSidecarTest`, `PumlAutoLayoutTest`, and `AtomicFilesTest` — all pure JUnit 4, no platform test fixture needed, since none of those classes import `com.intellij.*`. `PlantUmlRenderServiceTest` runs the real bundled PlantUML the same way, since `PlantUmlRenderService` is IDE-free too.

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
2. Open the file. Confirm it comes up on **View**, split, with the source on the left and a rendered diagram on the right, and that the tab strip along the bottom reads **View | Edit | Text** in that order.
3. Still on **View**, type a second class into the source pane: the render must follow it as you type. Work the switch in the tab's top-right corner through Editor / Split / Preview, close the file and reopen it — it must come back in the layout you left it in, caret included. Drag the divider, then drag the whole editor narrow and wide: the diagram scales, never squashes. Try **1:1**, `Ctrl`+scroll, and **Fit width**. Then break the syntax on purpose — a short error panel with a line number, and the tab stays open.
   Then check the same render still follows an edit made _elsewhere_: with **View** on Preview only, type a class into the **Text** tab and switch back. (This is the regression a per-render `loadHTML` caused, and the one the hidden-pane deferral could reintroduce — check it explicitly.)
4. Repeat step 3 with a C4 file whose header is `!includeurl https://…/C4-PlantUML/…/C4_Container.puml`: it must render offline, because the include is answered from the macros vendored under `resources/c4/`. Do it with the machine's network actually off, not just unplugged from the internet — a render that silently reaches out looks identical to one that doesn't until the day it can't.
5. Switch to **Edit**. Confirm the canvas shows `Customer` and `Order` and the `1`/`*` association between them.
6. Move a node, then switch to **Text**: the PlantUML should be unchanged (positions aren't PlantUML), but an `example.puml.layout.json` should have appeared next to the file.
7. Arrange the diagram, once from the canvas's **Auto layout** button and once from **Tools → Architect Studio → Auto Layout**. Edges must re-route rather than keep their old polylines, `Ctrl+Z` must restore what was there before, and `git status` must show only `example.puml.layout.json` changed — the `.puml` text stays byte-identical.
8. **Then move a box by hand and leave it there.** Type a new class into **Text**, switch tabs, close and reopen the file: your box must still be where you put it. Nothing but the button may move an element — this is the contract, and an import-time arrange is what breaks it.
9. Add an attribute on the canvas, then switch to **Text** without saving: the new member should already be in the buffer, and `Ctrl+Z` should undo it. Save, and confirm the `.puml` on disk matches.
10. Type a new `class Invoice` into **Text**, then switch back to **Edit**: it should be on the canvas. Confirm no balloon warns about an external change — there is only one document now.
11. Open a native `.apollon` file and confirm New/Export/tool-window/auto-export all still behave exactly as before — this feature must not regress them. **Auto layout** works there too, and there the document itself changes; `Ctrl+Z` must still undo it.

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
