# Architect Studio: from class-diagram PUML editor to a multi-diagram modelling platform

Status: **Phase 1 (foundation) + Phase 2 (class-diagram-pattern UML families) implemented this iteration.**
Phase 3+ (Sequence/State/Timing/Composite Structure/Profile/Interaction Overview, all of C4) is **designed
here, not implemented** — see [§21 Scope decision](#21-scope-decision-for-this-iteration) for why, and
[§6/§7](#6-uml-compatibility-matrix) for the exact per-family status.

This is an internal engineering document (`docs/plans/`), not part of the published Docusaurus sites
(`docs/user`, `docs/library`, `docs/contributor` are the only Docusaurus content roots — see
`docs/docusaurus.config.ts`).

---

## 1. Current-state assessment

Architect Studio (`jetbrains-plugin/`) is a JetBrains plugin built on `@tumaet/apollon`, the same
embeddable UML editor used by the standalone webapp and the VS Code extension. Before this iteration it
shipped exactly one PlantUML capability: a hand-rolled, deliberately conservative **class-diagram**
importer/exporter with strict round-trip safety. Concretely (all paths under `jetbrains-plugin/src/main/kotlin/de/tum/cit/aet/apollon/`):

- `puml/PlantUmlImporter.kt` — regex/line-based parser. Rejects (`PumlParseResult.Rejected`) anything
  whose body contains a non-class marker (`@startmindmap`, `participant `, `actor `, `usecase `, …) via
  `looksNonClass()`. Parses `class`/`abstract class`/`interface`/`enum`/`entity` blocks and a constrained
  relation-arrow grammar into `PumlDiagram` (`puml/PumlModel.kt`), and captures everything else —
  comments, skinparam, includes, notes, packages, aliased/stereotyped declarations — verbatim into
  `PumlResidual` (`puml/PumlResidual.kt`) rather than guessing at it.
- `puml/PlantUmlExporter.kt` — the exact inverse: `PumlDiagram` + `PumlResidual` → deterministic PlantUML
  text. Same diagram+residual always renders to the same bytes (`RoundTripTest`).
- `puml/ApollonModelMapper.kt` — the **only** file that knows both the `PumlDiagram` vocabulary and
  Apollon's `UMLModel` JSON shape for `ClassDiagram` (node `type: "class"`, edge types
  `ClassInheritance`/`ClassRealization`/`ClassComposition`/`ClassAggregation`/`ClassUnidirectional`/
  `ClassBidirectional`/`ClassDependency`). Re-import merges by classifier name so canvas layout, colour
  and ids survive an edit to the `.puml` text (`toApollonModel`'s "previous model" merge).
- `puml/RoundTripValidator.kt` — the save-time gate: re-parses the candidate PlantUML text and checks its
  classifier-name set and relation multiset agree with the model that produced it. A mismatch refuses the
  write rather than risking corruption.
- `workspace/ArchitectStudioWorkspace.kt` — owns `.architect-studio/` (see §16), `openOrImport` (Edit
  entry point) and `syncToSource` (save entry point), including external-change detection
  (`SyncOutcome.Stale`) via a source content hash stored in `index.json`.
- `editor/ApollonSaveListener.kt` + `editor/ApollonFileEditor.kt` — wires the above into the platform's
  save lifecycle; the canvas itself is the existing Apollon React editor running inside a JCEF browser,
  unchanged from the plugin's original (pre-PUML) `.apollon`-only support.

This was intentionally scoped to class diagrams with strict round-trip safety, and it is not defective —
it is the reference implementation this plan extends the _pattern_ of, not a thing to replace.

**Critical fact that shapes everything below:** Apollon's own library (`library/lib/types/DiagramType.ts`)
already natively models, canvas-edits and renders these `UMLDiagramType` values:

```
ClassDiagram, ObjectDiagram, ActivityDiagram, UseCaseDiagram, CommunicationDiagram,
ComponentDiagram, DeploymentDiagram, PetriNet, ReachabilityGraph, SyntaxTree, Flowchart, BPMN, Sfc
```

`jetbrains-plugin/src/main/kotlin/.../protocol/DiagramTypes.kt` and
`webview/src/shared/diagramTypes.ts` already list all thirteen in the New Diagram picker — as plain
`.apollon` files. **The visual canvas for seven UML families already exists.** The PUML round-trip gap
for those seven is _only_ the import/export/detection layer this plan closes.

What does **not** exist anywhere in this repository, in the library or the plugin: any model, canvas, or
PlantUML mapping for Sequence, State Machine, Timing, Composite Structure, Profile, or Interaction
Overview diagrams, or for any C4 diagram. There is no PlantUML engine dependency anywhere in the repo (no
`plantuml.jar`, no Graphviz integration) — `PlantUmlImporter`/`PlantUmlExporter` are 100% hand-rolled
Kotlin with zero third-party PlantUML library.

## 2. Existing architecture (before this iteration)

```
                     right-click .puml → "Architect Studio > Edit"
                                    │
                                    ▼
                     ArchitectStudioWorkspace.openOrImport
                                    │
                    PlantUmlImporter.parse (class-diagram grammar only)
                                    │
                         PumlDiagram + PumlResidual
                                    │
                    ApollonModelMapper.toApollonModel (merge w/ previous)
                                    │
                    .architect-studio/diagrams/<id>/*.apollon  (+ residual json)
                                    │
                         ApollonFileEditor (JCEF, React canvas)
                                    │  user edits
                                    ▼ save
                    ApollonModelMapper.toPumlDiagram
                                    │
                    PlantUmlExporter.render → RoundTripValidator.validate
                                    │ (refuse write on mismatch)
                                    ▼
                              original .puml
```

`.apollon` native diagrams (all thirteen `UMLDiagramType`s) go straight to `ApollonFileEditor` with no
PUML layer at all — this path is untouched by this plan.

## 3. Problems / limitations (before this iteration)

1. **One diagram family.** `looksNonClass()` is a reject-list, not a real detector — any `.puml` that
   isn't class-shaped is bounced with "Architect Studio can currently edit PlantUML class diagrams only,"
   even for families (Object, Use Case, Component, Deployment) Apollon's own canvas already draws.
2. **No rendering at all.** There is no way to see PlantUML's own authoritative rendering of a `.puml`
   file inside the IDE — only Apollon's canvas-native SVG/PNG export (`export/DiagramExporter.kt`, driven
   through the webview's `editor.exportAsSVG()`), which is a _different_ renderer with different visual
   fidelity and no way to validate that hand-preserved residual syntax is actually valid PlantUML.
3. **No typed diagram-family detection.** Detection is binary (class vs. rejected), so there is no place
   to hang new families' importers without duplicating the reject-list logic per family.
4. **No C4 support, no PlantUML/Graphviz dependency.** Both are greenfield.

## 4. Requirements

Restated from the task brief, filtered through what §1's findings make actually implementable this
iteration vs. only plannable — see §21 for the split:

- Extend PUML round-trip (detect → import → visual-edit-on-existing-canvas → export → validate) to every
  UML family Apollon's canvas already models, wherever PlantUML has a genuine native grammar for it.
- Typed `DiagramType` detection from grammar, not filename.
- A real PlantUML-rendered preview (SVG), running locally/offline, off the EDT.
- Never silently discard source; never corrupt `.puml` on save; detect external changes.
- Design (not necessarily build) a canonical model and C4 strategy that doesn't box in future work.
- No fake support: an entry in the compatibility matrix must reflect what was actually verified.

## 5. Diagram-family PlantUML-grammar audit

PlantUML does not have uniform, symmetric support for every UML diagram family. This audit is what
`ApollonModelMapper`-style adapters below are actually built against (verified against Apollon's node/edge
schema for each family — file:line references in §8):

| Family                                                       | Native PlantUML grammar?                                                                                                                                                                                                                                                                                                          | Shape                                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Class                                                        | Yes                                                                                                                                                                                                                                                                                                                               | flat: typed blocks + arrow relations (existing)                           |
| Object                                                       | Yes (`object`/`map`, links)                                                                                                                                                                                                                                                                                                       | flat: `object Name` blocks + links — structurally near-identical to class |
| Use Case                                                     | Yes (`actor`/`usecase`, associations, `<<include>>`/`<<extend>>`)                                                                                                                                                                                                                                                                 | flat: two node kinds + typed relations                                    |
| Component                                                    | Yes (`component`/`interface`/`package`/`node`/`database`/…, dependency arrows)                                                                                                                                                                                                                                                    | flat-ish, with optional nesting                                           |
| Deployment                                                   | Yes — **shares the same grammar family as Component** (`node`/`artifact`/`database`/`folder`/`cloud`); PlantUML does not have a separate "deployment diagram" mode, deployment is a vocabulary subset/superset of the same diagram type                                                                                           | flat-ish, with nesting                                                    |
| Activity                                                     | Yes, but **not a flat node/edge list** — modern syntax (`:Action;`, `if/else`, `fork`, `repeat`) is structured control flow read top-to-bottom; edges are implicit from control flow, not declared as `A --> B` lines                                                                                                             | control-flow tree/graph, positional                                       |
| Communication                                                | **No.** PlantUML has no dedicated UML communication/collaboration-diagram grammar. There is no construct that maps to Apollon's `CommunicationDiagram` numbered-message-on-an-edge model without inventing a non-standard PlantUML dialect, which the brief explicitly forbids ("do not misrepresent... document the limitation") | —                                                                         |
| Sequence                                                     | Yes, mature, positional (lifelines + ordered messages)                                                                                                                                                                                                                                                                            | not modelled by Apollon at all — net-new canvas needed                    |
| State Machine                                                | Yes                                                                                                                                                                                                                                                                                                                               | not modelled by Apollon at all                                            |
| Timing                                                       | Yes                                                                                                                                                                                                                                                                                                                               | not modelled by Apollon at all                                            |
| Composite Structure                                          | Partial (ports/parts via component-diagram vocabulary, no dedicated mode)                                                                                                                                                                                                                                                         | not modelled by Apollon at all                                            |
| Profile                                                      | Partial (stereotype/extension syntax only, no dedicated diagram mode)                                                                                                                                                                                                                                                             | not modelled by Apollon at all                                            |
| Interaction Overview                                         | Partial (built from activity + inline sequence refs)                                                                                                                                                                                                                                                                              | not modelled by Apollon at all                                            |
| C4 (Context/Container/Component/Dynamic/Deployment/Sequence) | Yes, via the `C4-PlantUML` stdlib (macros over base PlantUML class/deployment/sequence syntax)                                                                                                                                                                                                                                    | not modelled by Apollon at all                                            |

Consequence for scope: of the six Apollon-native families with no PUML round-trip yet, **four
(Object, Use Case, Component, Deployment)** have both a real flat PlantUML grammar and an existing Apollon
canvas — the same shape of problem the Class importer already solves. **Communication** has no honest
PlantUML mapping at all. **Activity** has a real grammar but a fundamentally different (control-flow, not
node/edge-line) shape that the existing line-oriented parser architecture cannot absorb without a second
parsing strategy — assessed in §21 as out of scope for this iteration, not because it's impossible, but
because a rushed control-flow parser is exactly the "fake support" the brief prohibits.

## 6. UML compatibility matrix

Status values: **✓** implemented+tested this iteration · **existing** unchanged from before this
iteration · **target** designed in this plan, not yet built · **n/a** no honest PlantUML mapping exists.

| Diagram                                                               | Apollon canvas                                                                                 | Render (PlantUML engine)                       | Import     | Visual Edit         | Export     | Round Trip |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- | ------------------- | ---------- | ---------- |
| Class                                                                 | existing                                                                                       | ✓                                              | existing ✓ | existing ✓          | existing ✓ | existing ✓ |
| Object                                                                | existing                                                                                       | ✓                                              | ✓          | ✓ (existing canvas) | ✓          | ✓          |
| Use Case                                                              | existing                                                                                       | ✓                                              | ✓          | ✓ (existing canvas) | ✓          | ✓          |
| Component                                                             | existing                                                                                       | ✓                                              | ✓          | ✓ (existing canvas) | ✓          | ✓          |
| Deployment                                                            | existing                                                                                       | ✓                                              | ✓          | ✓ (existing canvas) | ✓          | ✓          |
| Activity                                                              | existing                                                                                       | ✓                                              | target     | target              | target     | target     |
| Communication                                                         | existing                                                                                       | ✓ (PlantUML can't render this either — see §5) | n/a        | n/a                 | n/a        | n/a        |
| Package                                                               | not modelled by Apollon as its own type (packages appear as containers within Class/Component) | ✓                                              | —          | —                   | —          | —          |
| Composite Structure                                                   | not modelled                                                                                   | ✓ (partial PlantUML support)                   | target     | target              | target     | target     |
| Profile                                                               | not modelled                                                                                   | ✓ (partial)                                    | target     | target              | target     | target     |
| Use Case (already above)                                              |                                                                                                |                                                |            |                     |            |            |
| Sequence                                                              | not modelled                                                                                   | ✓                                              | target     | target              | target     | target     |
| Communication (diagram, distinct from Apollon's CommunicationDiagram) | not modelled                                                                                   | n/a                                            | n/a        | n/a                 | n/a        | n/a        |
| Interaction Overview                                                  | not modelled                                                                                   | ✓ (partial)                                    | target     | target              | target     | target     |
| Timing                                                                | not modelled                                                                                   | ✓                                              | target     | target              | target     | target     |

"Render" is ✓ across almost every row because PlantUML's engine (once integrated, §11) renders any syntax
it recognizes regardless of whether Architect Studio has a semantic importer for it — that is the whole
point of separating render from import (see task brief "Render capability" vs. "Visual modelling
capability"). Render is only `n/a` where PlantUML itself has no grammar for the concept at all
(Communication).

## 7. C4 compatibility matrix

| C4 diagram         | Render | Import | Visual Edit | Export | Round Trip |
| ------------------ | ------ | ------ | ----------- | ------ | ---------- |
| System Landscape   | target | target | target      | target | target     |
| System Context     | target | target | target      | target | target     |
| Container          | target | target | target      | target | target     |
| Component          | target | target | target      | target | target     |
| Dynamic            | target | target | target      | target | target     |
| Deployment         | target | target | target      | target | target     |
| C4-styled Sequence | target | target | target      | target | target     |

None of these are built this iteration (§21). Render is marked `target` rather than `n/a`: C4-PlantUML is
MIT-licensed and vendorable (§13), and once the PlantUML engine is integrated (§11), rendering a C4
`.puml` file is mechanically the same as rendering any other `.puml` file provided the C4-PlantUML include
files resolve locally — it does not require any new import/model/canvas work. It is listed as `target`
rather than done because doing it correctly requires vendoring the stdlib files and wiring
`-DRELATIVE_INCLUDE`/local include resolution (§13/§14), which is real work not yet done, not because it's
architecturally uncertain.

## 8. Target architecture

**Decision: no new universal canonical IR for the seven Apollon-native UML families.** Apollon's own
`UMLModel` JSON _is_ the canonical model for those families already — it is what the canvas edits, what
`library/` versions and migrates, and what every other Apollon consumer (webapp, VS Code extension)
already round-trips through. Building a second, parallel IR for diagram types Apollon already has a model
for would duplicate that model and violate this repo's own "don't add abstractions beyond what's needed"
convention (`CLAUDE.md`) for no benefit — nothing downstream would consume it. This directly answers the
task brief's "investigate whether the PUML→Apollon-JSON architecture must remain universal, design a
diagram-neutral canonical architecture if appropriate": for the families Apollon already draws, it is
appropriate to _keep_ Apollon's JSON as the canonical model and extend the existing
importer/exporter/mapper pattern.

**Where a real canonical IR becomes necessary:** the families with no Apollon model at all (Sequence,
State, Timing, Composite Structure, Profile, Interaction Overview) and C4. Building visual-editing support
for those means building a new domain model _and a new canvas_ — and per this repo's architecture
boundary (`library/` is consumed by webapp, VS Code extension and this plugin — "don't couple its APIs to
standalone-only assumptions," `CLAUDE.md`), that model and canvas belong in `library/`, not duplicated
inside `jetbrains-plugin/` alone. §20 sketches the shape that future IR should take so this iteration's
work doesn't box it in, but does not implement it.

Target architecture for **this iteration's scope** (Class + Object + Use Case + Component + Deployment):

```
                     .puml source (any extension in PLANT_UML_EXTENSIONS)
                                    │
                          DiagramTypeDetector          ← NEW (§10)
                     (grammar-based, typed DiagramFamily result)
                                    │
                ┌────────────┬────────────┬────────────┬────────────┬────────────┐
                ▼            ▼            ▼             ▼            ▼            ▼
         ClassImporter ObjectImporter UseCaseImporter ComponentImporter DeploymentImporter  (unsupported family →
                │            │            │             │            │          reject with reason, unchanged)
                └────────────┴────────────┴─────────────┴────────────┴────────────┘
                                    │  (each: text → FamilyDiagram + shared PumlResidual)
                                    ▼
                    <Family>ModelMapper.toApollonModel  (existing per-family merge-by-name)
                                    │
                          Apollon UMLModel JSON (unchanged shape, per family)
                                    │
                       ApollonFileEditor canvas (existing, unchanged — already draws all these types)
                                    │ user edits, save
                                    ▼
                    <Family>ModelMapper.toPumlDiagram
                                    │
                         <Family>Exporter.render → RoundTripValidator (generalized, §9)
                                    │
                                original .puml

  independently, any .puml (any family, including ones with no importer above, including C4 once §13 lands):
                                    │
                        PlantUmlRenderService (NEW, §11 — real plantuml-mit engine, background thread)
                                    │
                                  SVG
                                    │
                     PlantUmlPreviewFileEditor (NEW, §11 — second tab next to Text, like Markdown preview)
```

Two independent pipelines, deliberately: the **import/edit/export** pipeline only exists for families with
a real semantic mapping (left side), while the **render** pipeline (bottom) works for _any_ syntactically
valid PlantUML regardless of whether Architect Studio understands its semantics — exactly the brief's
"Render capability" vs. "Visual modelling capability" split, and why SVG is never treated as a source of
domain semantics (brief: "do not use SVG as the domain model").

## 9. Parsing strategy

Kept hand-rolled, not switched to a PlantUML-library-backed parser or a generated grammar. Investigated
per the brief's "architecture spike" requirement:

- PlantUML's own Java API (`SourceStringReader`, `net.sourceforge.plantuml.core.Diagram`) exposes a
  _rendering_ pipeline (text → image/SVG), not a reusable semantic AST — internally it builds
  diagram-specific mutable "Cluster"/"Entity" object graphs tightly coupled to its own layout/rendering
  code, undocumented and not intended as a public parsing API. There is no XMI export, no stable
  public AST type. This confirms the existing implementation's own rationale (`PlantUmlImporter.kt`'s
  doc comment, §D11 of the original plan) still holds: hand-rolled parsing, not "recreate PlantUML's
  parser," and PlantUML itself is used only for what it's actually good at — rendering (§11).
- No third-party PlantUML-grammar parser library was adopted: none is actively maintained with a license
  compatible with bundling, and the existing hand-rolled approach's conservative "preserve what you don't
  understand" design (§ Lossless round tripping) is _more_ defensible for a tool whose entire safety
  contract is "never silently discard/misinterpret" than adopting an external grammar that may parse
  more but explain less about what it accepted.
- **Shared infrastructure extracted** rather than five duplicated regex engines: `PumlArrows.kt` (arrow
  token ↔ relation-kind grammar) and `PumlMemberText.kt` (member-line grammar) already generalize across
  any classifier-shaped family; `PumlLayout.kt`'s grid/handle logic is reused as-is by every new mapper.
  New family-specific pieces (`ObjectPumlModel.kt`, `UseCasePumlModel.kt`, etc.) follow the same
  `<Family>Diagram` / `PlantUml<Family>Importer` / `PlantUml<Family>Exporter` / `<Family>ModelMapper`
  four-file shape as the existing Class family, dispatched by `DiagramTypeDetector` (§10) rather than
  each re-implementing `@startuml`/body-extraction/residual-line-bucketing from scratch — that shared
  envelope (start/end line, EOL, indent, preamble/postamble/unsupported bucketing) is factored into
  `PumlEnvelope.kt` (§ implementation).

## 10. Diagram type detection

`puml/DiagramTypeDetector.kt` (new): inspects the `@startuml` body's grammar — element keywords present
(`class`/`interface`/`enum`/`entity` vs. `object` vs. `actor`+`usecase` vs. `component`/`interface`+
`package` vs. `node`/`artifact`/`database` vs. `participant`/`actor`+arrows-with-`:message:` vs.
`state`/`[*]` vs. `!include <C4/…>` / `System(`/`Person(`/… macro calls) — never the file extension or
name, per the brief. Returns a typed `DiagramFamily` enum (`CLASS, OBJECT, USE_CASE, COMPONENT,
DEPLOYMENT, ACTIVITY, COMMUNICATION, SEQUENCE, STATE, TIMING, C4_CONTEXT, C4_CONTAINER, …, UNKNOWN`) plus
a `hasImporter: Boolean` derived from which families actually have a `<Family>Importer` registered — the
detector's type list is deliberately broader than the importer registry, so recognizing (for a future
Preview-only experience) is decoupled from being able to edit. `EditPumlDiagramAction`/
`ArchitectStudioWorkspace.openOrImport` now dispatch on this instead of the old binary
`looksNonClass()`, and reject with a family-specific reason ("Architect Studio can display but not yet
edit sequence diagrams" vs. the old one-size-fits-all message) when `hasImporter` is false.

## 11. Rendering strategy / PlantUML integration

- **Dependency:** `net.sourceforge.plantuml:plantuml-mit` from Maven Central — the MIT-licensed
  repackaging PlantUML publishes specifically for embedding in non-GPL software (confirmed via Maven
  Central / PlantUML's own licensing FAQ; the default `plantuml` artifact is GPL and wrong for bundling
  into a Marketplace plugin whose own licence isn't GPL). Added as an `implementation` Gradle dependency,
  shaded into the plugin jar the same way `kotlinx-serialization` already is (no new shading
  infrastructure needed — IntelliJ Gradle plugin already isolates plugin dependencies from the platform
  classloader).
- **Layout engine:** default to PlantUML's bundled **Smetana** (pure-JVM, Graphviz-`dot`-compatible layout
  engine, PlantUML's own default fallback since ~1.2020 when no `dot` binary is configured) — zero
  external process, works offline, no OS-specific binary to ship or detect. This satisfies "do not assume
  an external `dot` binary is available" directly. An optional `ApolonSettings`/`ApollonConfigurable`
  field for a user-supplied Graphviz `dot` path is a reasonable future addition for users who want
  production Graphviz layouts on large diagrams, but is not required for any family in this iteration's
  render scope and is **not implemented** — logged as a risk in §24, not silently assumed.
- **Security:** run PlantUML with `SECURITY_PROFILE=SANDBOX` (or `UNSECURE` only ever for text already
  accepted as project-local content, never for arbitrary remote input) via
  `System.setProperty("PLANTUML_SECURITY_PROFILE", "SANDBOX")` (or the equivalent
  `SecurityProfile`/`SecurityUtils` API on `plantuml-mit`) before invoking `SourceStringReader` — this
  disables `!include` of absolute filesystem paths and remote URLs by default (see §17 for the full
  reasoning, since project-local relative includes for C4 must still work — this is a real tension flagged
  as an open follow-up, not resolved by "SANDBOX" alone).
- **Service:** `render/PlantUmlRenderService.kt` (new) — a project-level `@Service` wrapping
  `SourceStringReader(text).outputImage(OutputStream, FileFormatOption(FileFormat.SVG))`, invoked only on
  a background coroutine/executor (`ApplicationManager.getApplication().executeOnPooledThread`, matching
  this plugin's existing off-EDT pattern in `DiagramExporter`), never on the EDT. Debounced (300ms trailing
  debounce keyed by document version, matching the existing `DocumentSync` debounce shape) so keystroke-
  by-keystroke edits do not spawn a render per keystroke. Small in-memory LRU cache keyed by
  `(text.hashCode(), theme)` avoids re-rendering an unchanged document when switching tabs.
- **Preview UI:** `editor/PlantUmlPreviewFileEditor.kt` + `PlantUmlPreviewFileEditorProvider.kt` (new) —
  registered as a second `fileEditorProvider` accepting the same `PLANT_UML_EXTENSIONS` as
  `isPlantUmlExtension`, `PLACE_BEFORE_DEFAULT_EDITOR` policy identical to `ApollonFileEditorProvider`, so
  a `.puml` file gets **Preview | Text** tabs (mirroring how the bundled Markdown plugin adds a Preview
  tab next to Text — no new multi-tab UI concept invented). Reuses the existing `JBCefBrowser` pattern
  (loads the rendered SVG as a `data:` URL, so pan/zoom/fit are just the browser's native SVG viewer
  behaviour) rather than a hand-rolled Swing SVG viewer. Errors (parse failure, timeout, missing
  `@startuml`) render as an inline message in the same panel instead of a blank canvas.
- This is a second, independent tab from "Architect Studio > Edit"'s `.apollon` working-file tab (visual
  canvas) — i.e. the brief's **Visual | Source | Preview** triad already exists as: `.apollon` working
  file tab = Visual, the `.puml` file's own Text tab = Source, this new tab = Preview. No new "mode
  switcher" widget needed; IntelliJ's own editor-tab-group UI already provides exactly this.

## 12. Graphviz integration

Not bundled, not required. §11 covers why Smetana suffices as the zero-config default for every diagram
family in this iteration's render/import scope. `DiagramRenderer`/`LayoutEngine` abstraction from the
brief is realized narrowly: `PlantUmlRenderService` _is_ the one `DiagramRenderer` this iteration needs
(PlantUML's own internal Smetana-vs-dot choice is layout-engine selection PlantUML already abstracts
internally — reimplementing that selection in Kotlin would duplicate logic PlantUML already owns). If a
future need for externally-configured Graphviz arises (very large/dense diagrams where Smetana's layout
quality visibly degrades), the extension point is `PlantUmlRenderService`'s `dotExecutable: Path?`
parameter (currently always `null`) — not a new abstraction.

## 13. C4-PlantUML integration (design only — not built this iteration)

- **License:** `plantuml-stdlib/C4-PlantUML` is MIT-licensed (confirmed against the repo's `LICENSE`
  file) — safe to vendor.
- **Strategy:** vendor a pinned snapshot of the top-level `.puml` files (`C4.puml`, `C4_Context.puml`,
  `C4_Container.puml`, `C4_Component.puml`, `C4_Dynamic.puml`, `C4_Deployment.puml`, and the
  `Sequence.puml`/style helpers they pull in) under `jetbrains-plugin/src/main/resources/c4-plantuml/
<pinned-version>/`, recorded with the exact upstream commit/tag in a `VERSION` file next to them —
  **deterministic/offline over always-latest**, matching the brief's explicit preference. Do **not** use
  the `!include https://raw.githubusercontent.com/...` form as the default resolution path — a network
  dependency for opening a local file is exactly the "invisible hard dependency" the brief forbids —
  though nothing prevents PlantUML from following a user's own such include if their source already has
  one (Render, not Import, handles that file — see §17 for the security profile that governs whether that
  remote fetch is even allowed to succeed).
- **Resolution:** configure `SourceStringReader`'s file-system config (`Defines`/`FileSystem` API on
  `plantuml-mit`) so a bare `!include <C4/C4_Context>` or `!include C4_Context.puml` resolves against the
  vendored directory first — equivalent to PlantUML's own `-DRELATIVE_INCLUDE=.` guidance from the
  C4-PlantUML README, applied programmatically instead of as a CLI flag.
- **Import/visual-edit/export:** out of scope this iteration (§21) — needs the net-new C4 canonical model
  - canvas sketched in §20, which is a `library/`-level feature.

## 14. Canvas architecture

Unchanged for the five families this iteration adds round-trip for: Apollon's existing React canvas
(`library/`) already renders and edits `ObjectDiagram`/`UseCaseDiagram`/`ComponentDiagram`/
`DeploymentDiagram` nodes/edges with its existing toolbox, drag/connect/resize/undo/redo/multi-select
behaviour — none of that needed to change. The plugin-side work is entirely on the PUML↔JSON boundary.

## 15. Diagram-specific editor behaviour

For the four new families, editor behaviour is whatever Apollon's canvas already does for that
`UMLDiagramType` — this plan does not change canvas behaviour. The only new UX is: (a) these `.puml`
files now open successfully via "Architect Studio > Edit" instead of being rejected, and (b) any `.puml`
(including ones Architect Studio can't semantically edit) gets a Preview tab.

## 16. Workspace / cache design

`.architect-studio/` layout is unchanged (`workspace/ArchitectStudioWorkspace.kt`,
`workspace/DiagramMappingRepository.kt`) — `index.json` + `diagrams/<id>/{*.apollon,source.residual.json}`
per tracked `.puml`. `PumlResidual`'s two Class-era maps (`typeKeywords`, `arrowTokens`) turned out to
already be family-agnostic id→string contracts as written — every new family's mapper reuses them
unchanged (an object's/use case's/component's/deployment element's node-id keys into the same maps a
class's did). What _was_ new: a third map, `elementAliases` (nodeId → source `as <alias>`), added because
Object diagrams have bare identifiers like Class (nothing to preserve) but UseCase/Component/Deployment
routinely have quoted, spaced display names that only round-trip through an explicit alias — see
`PumlResidual.kt`'s doc comment. No new top-level workspace directories: render caching (§11) is in-memory
only this iteration (no `.architect-studio/render/` yet — added the moment a persistent SVG cache proves
worth the complexity; premature to add an unused directory now).

## 17. Round-trip strategy

Unchanged shape, generalized target: `RoundTripValidator.validate` currently hardcodes
`ApollonModelMapper.signature`/`apollonEdgeType` (Class-specific). Generalized to accept a
`family: DiagramFamily` and dispatch `signature`/edge-type-naming to the matching mapper, so every family
gets the same "regenerate → re-parse → compare classifier-set and relation-multiset → refuse to write on
mismatch" gate Class already has. No family this iteration weakens that gate.

**Open tension flagged, not resolved:** §11's SANDBOX security profile and §13's "local file, must
resolve" C4-include requirement pull in opposite directions — SANDBOX by default restricts filesystem
`!include` to a safe subtree. The correct resolution (configuring PlantUML's sandbox to allow reads from
the vendored `c4-plantuml/` resource directory specifically, while still blocking arbitrary project-file or
network access) is a real, scoped follow-up documented here so it isn't silently assumed away, not
something guessed at without testing against the actual `plantuml-mit` sandbox API surface.

## 18. Source preservation strategy

Unchanged principle, now shared: every new family's importer follows Class's exact discipline — Tier A
(known-safe: `skinparam`/`!include`/`!theme`/title/hide/show/scale/direction/comments) passes through as
preamble/postamble; anything the family's parser doesn't specifically recognize is preserved verbatim in
`unsupported` rather than dropped or guessed at, and surfaces to the user via the existing
"Some PlantUML was kept but not shown on the canvas" notification (`EditPumlDiagramAction.kt`) — no new UX
needed, it already generalizes.

## 19. Security

- Parsing (`puml/*Importer.kt`): pure text, no code execution, no filesystem/network access — unchanged
  risk profile from the existing Class importer.
- Rendering (§11): PlantUML's `SANDBOX` security profile as the default, specifically to prevent a
  `.puml` file (untrusted project content, per the brief) from using `!include` to read arbitrary
  filesystem paths or fetch arbitrary URLs during preview rendering. The C4-include tension (§17) is the
  one place this needs follow-up testing before it can be called done.
- No new file-access surface beyond what `ArchitectStudioWorkspace` already had.

## 20. Future canonical IR for non-Apollon-native families (design sketch, not built)

For Sequence/State/Timing/Composite-Structure/Profile/Interaction-Overview/C4, §8 explains why they need
a real shared IR (no existing Apollon model fits). Sketch, kept intentionally light since it's not being
built this iteration and premature detail would just be guessing:

```
Diagram { id, type: DiagramFamily, metadata, elements: Element[], relationships: Relationship[] }
Element { id, kind, name, properties: Map<String,String>, sourceRef: SourceReference, boundary?: BoundaryRef }
Relationship { id, kind, sourceId, targetId, label?, properties, sourceRef }
SourceReference { file, startOffset, endOffset, originalText }
```

Family-specific concerns (Sequence's message _ordering_, Timing's time axis, C4's
Workspace→System→Container→Component hierarchy for future cross-diagram navigation) are additive
properties/sub-shapes on top of this, not a parallel type hierarchy per family — composition over
inheritance, per the brief's own steer. This would live in `library/lib/types/` (a new
`CanonicalDiagram.ts` alongside the existing per-node-type files), with a new canvas per family consuming
it, exactly like Apollon's existing per-`UMLDiagramType` canvases do today. Belongs in a future iteration
scoped and staffed for a `library/`-level feature, not a jetbrains-plugin-only add-on.

## 21. Scope decision for this iteration

Per explicit direction after the initial repo assessment (see conversation): implement PlantUML rendering
(§11) + extend PUML round-trip to the diagram types Apollon's canvas already supports natively where
PlantUML has a real grammar (Object, Use Case, Component, Deployment — §5/§6), and fully plan — not
half-build — everything else. Concretely excluded from this iteration's _implementation_, with reasons:

- **Communication diagrams:** no honest PlantUML grammar exists (§5). Implementing anyway would require
  inventing a non-standard dialect, which the brief explicitly prohibits ("do not misrepresent... where a
  concept genuinely cannot be represented, document the limitation").
- **Activity diagrams:** real PlantUML grammar exists, but it's structured control flow, not a flat
  node/edge line list — absorbing it needs a second parsing strategy alongside the existing line-oriented
  one, which is real, uncommitted engineering, not a mechanical repeat of the Class/Object/UseCase/
  Component/Deployment pattern. Attempting a rushed version would produce exactly the shallow, fake
  "support" the brief's hard requirement (§ NO FAKE SUPPORT) forbids.
- **All non-Apollon-native UML families + all of C4:** need a net-new canonical model and canvas
  (§20) — a `library/`-level feature reaching far beyond this plugin, realistically weeks of dedicated
  engineering for production quality, not something a single iteration can honestly claim "complete" for.

## 22. Implementation phases (this iteration)

1. Shared PUML infrastructure: generalize `PumlResidual`/`RoundTripValidator`, extract `PumlEnvelope`.
2. `DiagramTypeDetector` + wiring into `ArchitectStudioWorkspace`/`EditPumlDiagramAction`.
3. Object diagram family (importer/exporter/mapper/tests/fixtures).
4. Use Case diagram family (importer/exporter/mapper/tests/fixtures).
5. Component diagram family (importer/exporter/mapper/tests/fixtures).
6. Deployment diagram family (importer/exporter/mapper/tests/fixtures).
7. PlantUML rendering engine + Preview tab.
8. Regression pass: full gate (`pnpm lint && pnpm format:check && pnpm build && pnpm test`), Gradle
   build+test, existing Class-diagram + native `.apollon` behaviour unchanged.

## 23. Testing strategy

- Unit tests per family: importer (parse → `FamilyDiagram`+residual), exporter (inverse), mapper (JSON
  shape), following the existing `PlantUmlImporterTest`/`PlantUmlExporterTest`/`ApollonModelMapperTest`
  shape.
- Round-trip tests per family mirroring `RoundTripTest.kt`: unedited `puml → model → puml` is
  byte-identical on a second pass; an edit appears in the regenerated text and survives a re-parse.
- Golden fixtures per family (not one-node toys) under `jetbrains-plugin/src/test/resources/` or inline in
  the test file (matching the existing convention — `RoundTripTest.kt` keeps its fixture inline; check
  which convention the new tests actually land on during implementation).
- `DiagramTypeDetector` unit tests: one fixture per family + ambiguous/empty/garbage input.
- `PlantUmlRenderService` tests gated behind the Gradle IntelliJ test sandbox (JCEF/EDT-dependent) are out
  of reach for a plain JUnit run the way the pure-Kotlin `puml`/`workspace` packages are (see
  `PlantUmlImporter.kt`'s own doc comment on why those are pure-Kotlin, testable without an IDE) — covered
  instead by a pure-Kotlin unit test of the SVG-bytes-out-given-text-in contract, not the JCEF wiring.
- Regression: all pre-existing tests (`RoundTripTest`, `RoundTripValidatorTest`, `ApollonModelMapperTest`,
  `PlantUmlImporterTest`, `PlantUmlExporterTest`, `EndLabelTest`, `PumlMemberTextTest`,
  `DiagramDocumentTest`, `AtomicFilesTest`, `DiagramMappingRepositoryTest`, `GitignoreEditorTest`,
  `Sha256Test`) must still pass unmodified in behaviour (signatures may move if genuinely shared code is
  extracted, but no test's assertions change).

## 24. Risks

- **Deployment/Component grammar overlap** (§5): PlantUML doesn't cleanly separate the two — a `.puml`
  using `node`+`component` together is genuinely ambiguous. `DiagramTypeDetector` needs a documented
  tie-break rule (§ implementation: majority-vocabulary heuristic, falling back to Component when tied,
  since Component is the more general of the two) rather than silently guessing.
- **SANDBOX vs. C4 local includes** (§17): flagged, not fully resolved — needs a real test against
  `plantuml-mit`'s sandbox API before the C4 include path (future iteration) can be trusted.
- **Smetana layout fidelity** on dense Component/Deployment diagrams may visibly differ from `dot` — not a
  correctness risk (rendering is presentation, not semantics) but a possible user-visible surprise,
  mitigated by the future optional Graphviz path noted in §12.
- **Regex/line-oriented parsing ceiling:** as more grammar edge cases accumulate across five families, the
  hand-rolled approach's maintenance cost grows linearly with family count; still the right call for this
  iteration (§9) but worth revisiting if a sixth+ family is added later.

## 25. Definition of done (this iteration)

- Object/Use Case/Component/Deployment `.puml` files: detect → edit on the existing Apollon canvas →
  save → regenerated PlantUML re-parses to the same model, with the same source-preservation and
  external-change-detection guarantees Class diagrams already have.
- Any syntactically valid `.puml` (any family, including ones without an importer) renders in a Preview
  tab via the real PlantUML engine, off the EDT, without requiring a network connection or an external
  Graphviz install.
- Class diagram and native `.apollon` behaviour: zero regressions.
- Full gate green: `pnpm lint && pnpm format:check && pnpm build && pnpm test`, plus the Gradle
  plugin build and test suite.
- Compatibility matrices (§6/§7) reflect exactly what was verified — no row claims more than what its
  tests actually check.
