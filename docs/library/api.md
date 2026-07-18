---
id: api
title: API
description: The complete ApollonEditor reference — constructor options, lifecycle, state, subscriptions, and export.
---

# API

`ApollonEditor` is the only class you construct. It mounts its own React tree
into the DOM node you hand it and exposes an imperative API — your host code
never touches React.

```ts no-check
import { ApollonEditor, UMLDiagramType } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const editor = new ApollonEditor(container, {
  type: UMLDiagramType.ClassDiagram,
})
```

For internals (node/edge components, etc.), read `dist/index.d.ts`.

React hosts do not construct `ApollonEditor` directly — they render the
[`<Apollon>` component](#apollon-react-component) instead. The imperative class
documented below remains the API for non-React hosts and for advanced control.

## `<Apollon>` React component

For React hosts, `<Apollon>` wraps `ApollonEditor` and owns its lifecycle: it
constructs the editor on mount and destroys it on unmount. Import it from the
package's main entry, `@tumaet/apollon` — see [React](/library/embedding/react) for
the full integration story (hooks, provider, ref, controlled-model overlay).

```tsx
import { Apollon } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
;<Apollon style={{ height: 600 }} />
```

### `ApollonProps`

Container, lifecycle, and two layers of editor options.

**Container.** `className`, `style` (needs an explicit non-zero height), and
`children` rendered inside the editor's context provider. Omitting `children`
renders the default palette, zoom, and minimap; passing children makes the chrome
composition explicit, so include `<ApollonDefaultControls />` when custom children
should keep the default controls.

**Theming.** `theme` (a `--apollon-*` token object, typically from
`createApollonTheme(...)`) and `dataTheme` (`"light" | "dark"`) are spread onto
the mount node's `style` / `data-theme` on every render, so they are reactive in
the React wrapper. See [Theming](/library/theming).

**Initial-only options** — snapshotted at mount, ignored if they change
afterwards. Re-key the component to apply them to a new editor.

| Prop                   | Type                          | Effect                                                                                                                              |
| ---------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `defaultModel`         | `UMLModel`                    | Initial diagram.                                                                                                                    |
| `defaultType`          | `UMLDiagramType`              | Initial diagram type when no `defaultModel` is supplied.                                                                            |
| `defaultMode`          | `ApollonMode`                 | Initial mode — `Modelling`, `Assessment`, or `Exporting`.                                                                           |
| `defaultView`          | `ApollonView`                 | Initial view.                                                                                                                       |
| `availableViews`       | `ApollonView[]`               | Views the user may switch between at runtime.                                                                                       |
| `enablePopups`         | `boolean`                     | Enable inline edit/property popovers.                                                                                               |
| `collaborationEnabled` | `boolean`                     | Opt into Yjs real-time sync; wire the transport from `onMount`.                                                                     |
| `collaboration`        | `ApollonCollaborationOptions` | Fine-grained collaboration config (user identity + per-feature presence/cursor/follow toggles). Superset of `collaborationEnabled`. |
| `debug`                | `boolean`                     | Debug overlays/logging.                                                                                                             |

**Reactive options** — applied via the matching setter when the prop
changes; no rebuild. Passing `undefined` for any reactive prop leaves the
live value untouched (no reset). Re-key the component to fully reset.

| Prop                | Type                     | Maps to                                     |
| ------------------- | ------------------------ | ------------------------------------------- |
| `readonly`          | `boolean`                | `editor.setReadonly(value)`                 |
| `view`              | `ApollonView`            | `editor.view = value`                       |
| `mode`              | `ApollonMode`            | `editor.setMode(value)`                     |
| `scrollLock`        | `boolean`                | `editor.setScrollLock(value)`               |
| `keyboardShortcuts` | `boolean`                | `editor.setKeyboardShortcuts(value)`        |
| `labels`            | `Partial<ApollonLabels>` | `editor.setLabels(value)`                   |
| `tags`              | `boolean \| TagOptions`  | `editor.setTags(value)`                     |
| `previewMode`       | `boolean`                | `editor.setPreviewMode(value)`              |
| `model`             | `UMLModel`               | `editor.model = value` — controlled overlay |

**Lifecycle.**

| Prop      | Type                               | Purpose                                                                                |
| --------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `onMount` | `(editor) => void \| (() => void)` | Fires once after mount. The optional returned function runs as cleanup before destroy. |
| `ref`     | `Ref<ApollonEditor \| null>`       | Receives the editor after mount; nulled on unmount.                                    |

### Hooks

| Hook                                                | Returns                 | Purpose                                                       |
| --------------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| `useApollonEditor()`                                | `ApollonEditor \| null` | The editor for the nearest `<Apollon>` / `<ApollonProvider>`. |
| `useApollonEditorOrThrow()`                         | `ApollonEditor`         | Same, but throws if no editor is mounted.                     |
| `useApollonSubscription<T>(subscribe, getSnapshot)` | `T \| undefined`        | Subscribe to any `editor.subscribeTo*` channel with one call. |
| `<ApollonProvider editor={...}>`                    | —                       | Supply an externally-owned editor to descendants via context. |

## Constructor

```ts no-check
new ApollonEditor(element: HTMLElement, options?: ApollonOptions)
```

`element` must be an `HTMLElement` — the constructor throws
`Error("Element is required to initialize Apollon")` otherwise. The element
**must have an explicit height**; see [Quickstart](/library/quickstart) and
[Troubleshooting](/library/troubleshooting).

### `ApollonOptions`

Every field is optional.

| Option                 | Type                          | Default                        | Effect                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                 | `UMLDiagramType`              | `model.type` or `ClassDiagram` | Diagram type for a fresh canvas. Ignored when `model` is supplied and carries its own `type`.                                                                                                                                                                                                           |
| `mode`                 | `ApollonMode`                 | `Modelling`                    | `Modelling`, `Exporting`, or `Assessment`. Drives which UI affordances render.                                                                                                                                                                                                                          |
| `view`                 | `ApollonView`                 | `Modelling`                    | `Modelling`, `Exporting`, or `Highlight`. Initial view.                                                                                                                                                                                                                                                 |
| `availableViews`       | `ApollonView[]`               | `[Modelling]`                  | Views the user may switch between. If supplied, the editor merges `Modelling`, the array, and the configured `view`. If omitted and `view` is `Highlight`, defaults to `[Modelling, Highlight]`.                                                                                                        |
| `readonly`             | `boolean`                     | `false`                        | Locks the canvas. Can also be toggled at runtime with `setReadonly`.                                                                                                                                                                                                                                    |
| `enablePopups`         | `boolean`                     | `true`                         | Enables the inline edit/property popovers.                                                                                                                                                                                                                                                              |
| `model`                | `UMLModel`                    | empty diagram                  | Initial diagram. Use `importDiagram` first if the JSON may be a v2/v3 model.                                                                                                                                                                                                                            |
| `locale`               | `Locale`                      | `en`                           | Legacy no-op; use `labels` to localize editor strings.                                                                                                                                                                                                                                                  |
| `labels`               | `Partial<ApollonLabels>`      | English                        | Overrides any subset of the editor UI strings exposed in `ApollonLabels`; can be updated at runtime with `setLabels`.                                                                                                                                                                                   |
| `tags`                 | `boolean \| TagOptions`       | `false`                        | Enables + configures element-tag authoring (off by default). See [Element tags](/library/api/element-tags); can be updated at runtime with `setTags`.                                                                                                                                                   |
| `controls`             | `OverlayControlInput[]`       | default chrome                 | Built-in and custom controls to register initially. Omit for defaults, pass `[]` for a bare canvas, or pass descriptors from `paletteControl()`, `zoomControl()`, `miniMapControl()`, `defaultControls()`, or custom controls. See [Overlay controls](/library/api/overlay-controls).                   |
| `debug`                | `boolean`                     | `false`                        | Enables debug overlays/logging.                                                                                                                                                                                                                                                                         |
| `collaborationEnabled` | `boolean`                     | `false`                        | Opt into Yjs real-time sync. See [Collaboration](/library/api/collaboration). Disables the local undo manager.                                                                                                                                                                                          |
| `scrollLock`           | `boolean`                     | `false`                        | Prevents the canvas from capturing page scroll.                                                                                                                                                                                                                                                         |
| `collaboration`        | `ApollonCollaborationOptions` | —                              | Fine-grained collaboration config — `user` identity plus per-feature `showPresence` / `showCursors` / `showSelectionHighlights` / `showFollow` toggles. A superset of `collaborationEnabled`; setting `enabled` (or a `user`) here also turns sync on. See [Collaboration](/library/api/collaboration). |
| `theme`                | `--apollon-*` token map       | —                              | `--apollon-*` CSS custom properties applied to the mount element. Build one with `createApollonTheme`. Unset tokens fall back to the built-in light/dark values. See [Theming](/library/theming).                                                                                                       |
| `dataTheme`            | `"light" \| "dark"`           | inherited                      | Sets `data-theme` on the mount element. Omit to inherit whatever an ancestor declares (or the light default). See [Theming](/library/theming).                                                                                                                                                          |

## Lifecycle

| Member                                 | Returns | Purpose                                                                                                                    |
| -------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `new ApollonEditor(element, options?)` | —       | Mount the editor's React tree into `element`.                                                                              |
| `destroy()`                            | `void`  | Unmount, drop all subscriptions, stop sync, and destroy the Yjs doc. Always call before re-mounting on the same container. |

## State

### Model

| Member                     | Type                            | Purpose                                                                          |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| `model` (getter)           | `UMLModel`                      | Snapshot of the current diagram as plain JSON.                                   |
| `model` (setter)           | `UMLModel`                      | Replace the entire diagram. Pass `importDiagram(json)` if the JSON may be v2/v3. |
| `getDiagramMetadata()`     | `{ diagramTitle, diagramType }` | Title and type without serializing the whole model.                              |
| `updateDiagramTitle(name)` | `void`                          | Rename the diagram.                                                              |
| `diagramType` (setter)     | `UMLDiagramType`                | Switch diagram type. **Clears all nodes, edges, and assessments.**               |

### View and read-only state

| Member                                         | Type                                                | Purpose                                                                                                                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view` (getter / setter)                       | `ApollonView`                                       | Read or set the active view.                                                                                                                                                                                          |
| `setReadonly(readonly)`                        | `(boolean) => void`                                 | Toggle read-only at runtime. Clears selection and any open popover when locking.                                                                                                                                      |
| `setPreviewMode(active)`                       | `(boolean) => void`                                 | Overlay a snapshot on the canvas without writing to the Yjs doc. Used for version-history previews.                                                                                                                   |
| `toggleInteractiveElementsMode(forceEnabled?)` | `(boolean?) => void`                                | Toggle (or force) the `Highlight` view for marking interactive elements.                                                                                                                                              |
| `setMode(mode)`                                | `(ApollonMode) => void`                             | Switch between `Modelling`, `Assessment`, and `Exporting` at runtime.                                                                                                                                                 |
| `setScrollLock(locked)`                        | `(boolean) => void`                                 | Toggle whether the canvas captures page scroll.                                                                                                                                                                       |
| `setLabels(labels)`                            | `(Partial<ApollonLabels>) => void`                  | Replace localized editor strings by merging a partial dictionary over the English defaults.                                                                                                                           |
| `setTags(options?)`                            | `(boolean \| TagOptions) => void`                   | Enable + configure element-tag authoring (off by default) — `true` for free-form, an object for a fixed vocabulary. See [Element tags](/library/api/element-tags).                                                    |
| `setElementTags(id, tags)`                     | `(string, string[]) => void`                        | Replace one element's tags programmatically (a node or a class attribute/method); `[]` clears them.                                                                                                                   |
| `fitView(options?)`                            | `({ padding?, duration?, respectInsets? }) => void` | Fit the diagram in view, capped at `maxZoom: 1.0`. Respects reserved [overlay control](/library/api/overlay-controls) insets by default; pass `respectInsets: false` to ignore them. `duration` defaults to `200` ms. |

### Canvas geometry

| Member                           | Returns                  | Purpose                                           |
| -------------------------------- | ------------------------ | ------------------------------------------------- |
| `getNodes()`                     | `Node[]`                 | Live React Flow nodes (`[]` before init).         |
| `getEdges()`                     | `Edge[]`                 | Live React Flow edges (`[]` before init).         |
| `getViewport()`                  | `{ x, y, zoom } \| null` | Current viewport, or `null` before init.          |
| `screenToFlowPosition(position)` | `XYPosition \| null`     | Convert screen coordinates to canvas coordinates. |
| `flowToScreenPosition(position)` | `XYPosition \| null`     | Convert canvas coordinates to screen coordinates. |
| `getSelectedElements()`          | `string[]`               | IDs of the currently selected elements.           |

### Canvas overlays / controls

Inject floating chrome (toolbars, banners, rails) into the editor's measured,
inset-aware layout. See [Overlay controls](/library/api/overlay-controls) for
regions, the `<ApollonControl>` React component, and the "make room" model.

| Member                         | Type                                              | Purpose                                                                                        |
| ------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `addControl(control)`          | `(OverlayControlInput) => () => void`             | Register a floating control; returns a disposer. Throws on a bad region / empty id.            |
| `updateControl(id, patch)`     | `(string, Partial<OverlayControlInput>) => void`  | Patch a control's options/renderer (no-op if absent; `id` is immutable).                       |
| `removeControl(id)`            | `(string) => void`                                | Unregister a control by id (no-op if absent); the imperative hide for a built-in.              |
| `hasControl(id)`               | `(string) => boolean`                             | Whether a control with this id is registered.                                                  |
| `getControl(id)`               | `(string) => OverlayControlSnapshot \| undefined` | Read a registered control's current options (undefined if absent).                             |
| `getRegionElement(region)`     | `(OverlayRegion) => HTMLElement`                  | Stable pointer-transparent node to `createPortal` host chrome into (keeps host React context). |
| `releaseRegionElement(region)` | `(OverlayRegion) => void`                         | Release a region acquired via `getRegionElement`.                                              |

### Assessment

| Member                              | Type                                                              | Purpose                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addOrUpdateAssessment(assessment)` | `(Assessment) => void`                                            | Attach or update a score/feedback assessment on an element.                                                                                                                                                                                                                                                                      |
| `setElementHighlights(highlights)`  | `(Map<string, string> \| Record<string, string> \| null) => void` | Paint a translucent highlight overlay over the given element ids (id → CSS color) — e.g. to flag elements missing feedback or carrying suggestions. Host-driven and ephemeral: never written to the model, serialized, or shared with collaborators. Each call replaces the previous set; pass `null` or an empty map to clear.  |
| `getElementHighlights()`            | `() => Record<string, string>`                                    | The current highlight map (element id → CSS color).                                                                                                                                                                                                                                                                              |
| `getElementIdsByTag(tag)`           | `(string) => string[]`                                            | Ids of every element carrying the host-defined `tag` — a node, or one of its members (class attribute, method, SFC action row). Exact and case-sensitive apart from surrounding whitespace; `[]` for an unknown or blank tag. Pair with `setElementHighlights` to color a group — see [Element tags](/library/api/element-tags). |
| `getInteractiveForSerialization()`  | `InteractiveElements \| undefined`                                | Interactive-element flags for inclusion in a saved model.                                                                                                                                                                                                                                                                        |

## Subscriptions

Every `subscribeTo…` method returns a numeric subscription id. Pass it to
`unsubscribe(id)` to detach. `destroy()` drops all subscriptions automatically.

Unless noted otherwise, `subscribeTo*` channels are coarse: they re-fire on
any state-store change and the callback receives the **current** value of the
named field. `subscribeToSelectionChange` is the only channel with a built-in
prev/next equality check.

| Method                               | Callback signature                                  |
| ------------------------------------ | --------------------------------------------------- |
| `subscribeToModelChange(cb)`         | `(model: UMLModel) => void`                         |
| `subscribeToDiagramNameChange(cb)`   | `(title: string) => void`                           |
| `subscribeToSelectionChange(cb)`     | `(selectedElementIds: string[]) => void`            |
| `subscribeToAssessmentSelection(cb)` | `(selectedElementIds: string[]) => void`            |
| `subscribeToAwarenessChanges(cb)`    | `(states: Map<number, CollaborationState>) => void` |
| `subscribeToCollaboratorChanges(cb)` | `(collaborators: CollaboratorInfo[]) => void`       |
| `unsubscribe(subscriptionId)`        | `(number) => void`                                  |

```ts no-check
const id = editor.subscribeToModelChange((model) => persist(model))
// later
editor.unsubscribe(id)
```

## Collaboration

These members are only meaningful with `collaborationEnabled: true`. See
[Collaboration](/library/api/collaboration) for the full wiring.

| Member                                                | Type                                    | Purpose                                                             |
| ----------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `sendBroadcastMessage(sendFn)`                        | `((base64: string) => void) => void`    | Register the callback the editor uses to emit Yjs frames.           |
| `receiveBroadcastedMessage(base64Data)`               | `(string) => void`                      | Feed a received Yjs frame back into the editor.                     |
| `broadcastFullState()`                                | `() => void`                            | Push the entire local Yjs doc to peers — call on every (re)connect. |
| `setLocalAwarenessUser(user)`                         | `(CollaborationUser) => void`           | Set the local user's identity for awareness.                        |
| `setLocalAwarenessCursor(cursor)`                     | `(CollaborationCursor \| null) => void` | Publish the local cursor position.                                  |
| `setLocalAwarenessSelectedElement(id)`                | `(string \| null) => void`              | Publish the local selection.                                        |
| `setLocalAwarenessState(state)`                       | `(Partial<CollaborationState>) => void` | Set arbitrary local awareness state.                                |
| `getLocalAwarenessClientId()`                         | `() => number`                          | The local Yjs awareness client id.                                  |
| `getCollaborators()`                                  | `() => CollaboratorInfo[]`              | The current collaborator roster.                                    |
| `ApollonEditor.generateInitialSyncMessage()`          | `() => string` (static)                 | Base64 handshake frame to request an initial sync.                  |
| `ApollonEditor.generateInitialAwarenessSyncMessage()` | `() => string` (static)                 | Base64 handshake frame to request an awareness sync.                |

## Export

| Member                                            | Returns        | Purpose                                                              |
| ------------------------------------------------- | -------------- | -------------------------------------------------------------------- |
| `exportAsSVG(options?)`                           | `Promise<SVG>` | Render the **current** model to SVG.                                 |
| `ApollonEditor.exportModelAsSvg(model, options?)` | `Promise<SVG>` | Static. Render an **arbitrary** model to SVG with no mounted editor. |

`SVG` is `{ svg: string, clip: { x, y, width, height } }`. See
[Export](/library/api/export) for `ExportOptions` and the PNG/PDF pipeline, or
the [Conversion API](/library/api/conversion-api) to convert models to
SVG/PNG/PDF over HTTP via the standalone server.

## Keyboard shortcuts

`Mod` is Ctrl on Windows/Linux and Cmd on macOS; combos marked _view_ work on
read-only diagrams too. Nothing fires while the user is typing in a field or
while a dialog or menu is open.

| Combo                          | Action                                   |
| ------------------------------ | ---------------------------------------- |
| `Mod+A` / `Esc`                | Select all / clear selection (_view_)    |
| `Delete` / `Backspace`         | Delete selection                         |
| `Mod+C` / `Mod+X` / `Mod+V`    | Copy (_view_) / cut / paste              |
| `Mod+D`                        | Duplicate the selection beside itself    |
| Arrow keys                     | Nudge selection                          |
| `Mod+Z`, `Mod+Shift+Z`/`Mod+Y` | Undo, redo                               |
| `Mod+=` / `Mod+-`              | Zoom in / out (_view_)                   |
| `Mod+0`                        | Reset zoom to 100% (_view_)              |
| `Mod+Shift+1` / `Mod+Shift+2`  | Zoom to fit / zoom to selection (_view_) |

Figma and Excalidraw put the last two on `Shift+1`/`Shift+2`, but a shortcut
whose keys produce a printable character fails
[WCAG 2.1.4](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts)
unless it can be turned off, remapped, or scoped to focus.

Pass `keyboardShortcuts: false` to keep the editor's hands off every key above —
for a host that binds them itself, or that mounts more than one editor (they
listen on `document`, so two would both answer).

`APOLLON_SHORTCUTS` is the list the editor runs, so a host can render a sheet
that tracks it, or check it before binding a key of its own. Each entry's
**first** combo is the primary one — a sheet should render only that; the rest
are aliases (`Mod+Y` redo, layout variants of `Mod+=`). Entries flagged
`canvasHandled` are React Flow's, not the editor's own handler. `shortcutKeyName`
turns a combo into the key it names, so a sheet renders "1" rather than the
`Digit1` code that combo matches on.

`matchesShortcutCombo`, `isTypingTarget` and `isInsideOverlay` are the
primitives that handler matches and stands down with, exported so a host's own
keys behave like the editor's:

```ts
import {
  isInsideOverlay,
  isTypingTarget,
  matchesShortcutCombo,
  type ApollonShortcutCombo,
} from "@tumaet/apollon"

const rename: ApollonShortcutCombo = { key: "r", mod: true }

document.addEventListener("keydown", (event) => {
  if (event.isComposing || isTypingTarget(event) || isInsideOverlay(event)) {
    return
  }
  if (!matchesShortcutCombo(event, rename)) return
  event.preventDefault()
})
```

A combo matching on `key` follows what the user's layout prints and is compared
case-insensitively; use `code` for digits, whose character moves between layouts
and under Shift.

## Diagram types

Enum literals (the strings on the wire and in `UMLModel.type`) on the left;
human-facing labels used elsewhere on the right.

| Enum literal             | Label              |
| ------------------------ | ------------------ |
| `"ClassDiagram"`         | Class              |
| `"ObjectDiagram"`        | Object             |
| `"ActivityDiagram"`      | Activity           |
| `"UseCaseDiagram"`       | Use Case           |
| `"CommunicationDiagram"` | Communication      |
| `"ComponentDiagram"`     | Component          |
| `"DeploymentDiagram"`    | Deployment         |
| `"PetriNet"`             | Petri Net          |
| `"ReachabilityGraph"`    | Reachability Graph |
| `"SyntaxTree"`           | Syntax Tree        |
| `"Flowchart"`            | Flowchart          |
| `"BPMN"`                 | BPMN               |
| `"Sfc"`                  | SFC                |

## Enums

| Enum          | Members                                |
| ------------- | -------------------------------------- |
| `ApollonMode` | `Modelling`, `Exporting`, `Assessment` |
| `ApollonView` | `Modelling`, `Exporting`, `Highlight`  |
| `Locale`      | `en`, `de`                             |

See **[Collaboration](/library/api/collaboration)** for the Yjs hooks and
**[Export](/library/api/export)** for SVG/PNG/PDF/JSON details.
