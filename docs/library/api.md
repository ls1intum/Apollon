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
`children` rendered alongside the canvas inside the editor's context
provider.

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

| Prop          | Type          | Maps to                                     |
| ------------- | ------------- | ------------------------------------------- |
| `readonly`    | `boolean`     | `editor.setReadonly(value)`                 |
| `view`        | `ApollonView` | `editor.view = value`                       |
| `mode`        | `ApollonMode` | `editor.setMode(value)`                     |
| `scrollLock`  | `boolean`     | `editor.setScrollLock(value)`               |
| `previewMode` | `boolean`     | `editor.setPreviewMode(value)`              |
| `model`       | `UMLModel`    | `editor.model = value` — controlled overlay |

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
| `locale`               | `Locale`                      | `en`                           | Accepted for forward compatibility; the editor currently renders in English regardless.                                                                                                                                                                                                                 |
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

| Member                                         | Type                                                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view` (getter / setter)                       | `ApollonView`                                       | Read or set the active view.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `setReadonly(readonly)`                        | `(boolean) => void`                                 | Toggle read-only at runtime. Clears selection and any open popover when locking.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `setPreviewMode(active)`                       | `(boolean) => void`                                 | Overlay a snapshot on the canvas without writing to the Yjs doc. Used for version-history previews.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `toggleInteractiveElementsMode(forceEnabled?)` | `(boolean?) => void`                                | Toggle (or force) the `Highlight` view for marking interactive elements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `setMode(mode)`                                | `(ApollonMode) => void`                             | Switch between `Modelling`, `Assessment`, and `Exporting` at runtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `setScrollLock(locked)`                        | `(boolean) => void`                                 | Toggle whether the canvas captures page scroll.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `fitView(options?)`                            | `({ padding?, duration?, respectInsets? }) => void` | Zoom/pan so the whole diagram is visible (capped at `maxZoom: 1.0`). With no reserved insets and a scalar/absent `padding`, fits with a fraction (default `0.15`). When chrome is reserved — or `padding` is a per-side object — each side is padded by `inset + (per-side px ?? 16px gutter)` (the explicit px replaces the gutter; it does not stack with it). `respectInsets` (default `true`) includes the reserved [overlay control](/library/api/overlay-controls) insets; `duration` defaults to `200` ms. Retries up to 10 rAF ticks until nodes measure. |

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

Inject floating chrome (toolbars, banners, rails) that shares the editor's
collision-free, inset-aware layout. See [Overlay controls](/library/api/overlay-controls)
for regions, the `<ApollonControl>` React component, and the "make room" model.

| Member                         | Type                                             | Purpose                                                                             |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `addControl(control)`          | `(OverlayControlInput) => () => void`            | Register a floating control; returns a disposer. Throws on a bad region / empty id. |
| `updateControl(id, patch)`     | `(string, Partial<OverlayControlInput>) => void` | Patch a control's options/renderer (no-op if absent; `id` is immutable).            |
| `hasControl(id)`               | `(string) => boolean`                            | Whether a control with this id is registered.                                       |
| `getRegionElement(region)`     | `(OverlayRegion) => HTMLElement`                 | Stable node to `createPortal` host chrome into (keeps host React context).          |
| `releaseRegionElement(region)` | `(OverlayRegion) => void`                        | Release a region acquired via `getRegionElement`.                                   |

### Assessment

| Member                              | Type                                                              | Purpose                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addOrUpdateAssessment(assessment)` | `(Assessment) => void`                                            | Attach or update a score/feedback assessment on an element.                                                                                                                                                                                                                                                                     |
| `setElementHighlights(highlights)`  | `(Map<string, string> \| Record<string, string> \| null) => void` | Paint a translucent highlight overlay over the given element ids (id → CSS color) — e.g. to flag elements missing feedback or carrying suggestions. Host-driven and ephemeral: never written to the model, serialized, or shared with collaborators. Each call replaces the previous set; pass `null` or an empty map to clear. |
| `getElementHighlights()`            | `() => Record<string, string>`                                    | The current highlight map (element id → CSS color).                                                                                                                                                                                                                                                                             |
| `getInteractiveForSerialization()`  | `InteractiveElements \| undefined`                                | Interactive-element flags for inclusion in a saved model.                                                                                                                                                                                                                                                                       |

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
