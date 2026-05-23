---
id: api
title: API
description: The complete ApollonEditor reference — constructor options, lifecycle, state, subscriptions, and export.
---

# API

`ApollonEditor` is the only class you construct. It mounts its own React tree
into the DOM node you hand it and exposes an imperative API — your host code
never touches React.

```ts
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
`@tumaet/apollon/react` subpath — see [React](/library/embedding/react) for
the full integration story (hooks, provider, ref, controlled-model overlay).

```tsx
import { Apollon } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
;<Apollon style={{ height: 600 }} />
```

### `ApollonProps`

Container, lifecycle, and two layers of editor options.

**Container.** `className`, `style` (needs an explicit non-zero height), and
`children` rendered alongside the canvas inside the editor's context
provider.

**Initial-only options** — snapshotted at mount, ignored if they change
afterwards. Re-key the component to apply them to a new editor.

| Prop                   | Type             | Effect                                                          |
| ---------------------- | ---------------- | --------------------------------------------------------------- |
| `defaultModel`         | `UMLModel`       | Initial diagram.                                                |
| `defaultType`          | `UMLDiagramType` | Initial diagram type when no `defaultModel` is supplied.        |
| `defaultMode`          | `ApollonMode`    | Initial mode — `Modelling`, `Assessment`, or `Exporting`.       |
| `defaultView`          | `ApollonView`    | Initial view.                                                   |
| `availableViews`       | `ApollonView[]`  | Views the user may switch between at runtime.                   |
| `enablePopups`         | `boolean`        | Enable inline edit/property popovers.                           |
| `collaborationEnabled` | `boolean`        | Opt into Yjs real-time sync; wire the transport from `onMount`. |
| `debug`                | `boolean`        | Debug overlays/logging.                                         |

**Reactive options** — applied via the matching setter when the prop
changes; no rebuild. `undefined` resets boolean toggles to `false`; for
typed-enum / object props it means "leave the live value alone".

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

| Hook                                            | Returns                 | Purpose                                                       |
| ----------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| `useApollonEditor()`                            | `ApollonEditor \| null` | The editor for the nearest `<Apollon>` / `<ApollonProvider>`. |
| `useApollonEditorOrThrow()`                     | `ApollonEditor`         | Same, but throws if no editor is mounted.                     |
| `useApollonSubscription<T>(subscribe, initial)` | `T \| undefined`        | Subscribe to any `editor.subscribeTo*` channel with one call. |
| `<ApollonProvider editor={...}>`                | —                       | Supply an externally-owned editor to descendants via context. |

## Constructor

```ts
new ApollonEditor(element: HTMLElement, options?: ApollonOptions)
```

`element` must be a real `HTMLElement` — the constructor throws
`Error("Element is required to initialize Apollon")` otherwise. The element
**must have an explicit height**; see [Quickstart](/library/quickstart) and
[Troubleshooting](/library/troubleshooting).

### `ApollonOptions`

Every field is optional.

| Option                 | Type             | Default                        | Effect                                                                                                         |
| ---------------------- | ---------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `type`                 | `UMLDiagramType` | `model.type` or `ClassDiagram` | Diagram type for a fresh canvas. Ignored when `model` is supplied and carries its own `type`.                  |
| `mode`                 | `ApollonMode`    | `Modelling`                    | `Modelling`, `Exporting`, or `Assessment`. Drives which UI affordances render.                                 |
| `view`                 | `ApollonView`    | `Modelling`                    | `Modelling`, `Exporting`, or `Highlight`. Initial view.                                                        |
| `availableViews`       | `ApollonView[]`  | derived                        | Views the user may switch between. `Modelling` is always included; `view` is appended if not listed.           |
| `readonly`             | `boolean`        | `false`                        | Locks the canvas. Can also be toggled at runtime with `setReadonly`.                                           |
| `enablePopups`         | `boolean`        | editor default                 | Enables the inline edit/property popovers.                                                                     |
| `model`                | `UMLModel`       | empty diagram                  | Initial diagram. Use `importDiagram` first if the JSON may be a v2/v3 model.                                   |
| `locale`               | `Locale`         | `en`                           | Accepted for forward compatibility; the editor currently renders in English regardless.                        |
| `debug`                | `boolean`        | `false`                        | Enables debug overlays/logging.                                                                                |
| `collaborationEnabled` | `boolean`        | `false`                        | Opt into Yjs real-time sync. See [Collaboration](/library/api/collaboration). Disables the local undo manager. |
| `scrollLock`           | `boolean`        | `false`                        | Prevents the canvas from capturing page scroll.                                                                |

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

| Member                                         | Type                                | Purpose                                                                                                                           |
| ---------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `view` (getter / setter)                       | `ApollonView`                       | Read or set the active view.                                                                                                      |
| `setReadonly(readonly)`                        | `(boolean) => void`                 | Toggle read-only at runtime. Clears selection and any open popover when locking.                                                  |
| `setPreviewMode(active)`                       | `(boolean) => void`                 | Overlay a snapshot on the canvas without writing to the Yjs doc. Used for version-history previews.                               |
| `toggleInteractiveElementsMode(forceEnabled?)` | `(boolean?) => void`                | Toggle (or force) the `Highlight` view for marking interactive elements.                                                          |
| `fitView(options?)`                            | `({ padding?, duration? }) => void` | Zoom/pan so the whole diagram is visible. `padding` defaults to `0.15`, `duration` to `200` ms. Retries until nodes are measured. |

### Canvas geometry

| Member                           | Returns                  | Purpose                                           |
| -------------------------------- | ------------------------ | ------------------------------------------------- |
| `getNodes()`                     | `Node[]`                 | Live React Flow nodes (`[]` before init).         |
| `getEdges()`                     | `Edge[]`                 | Live React Flow edges (`[]` before init).         |
| `getViewport()`                  | `{ x, y, zoom } \| null` | Current viewport, or `null` before init.          |
| `screenToFlowPosition(position)` | `XYPosition \| null`     | Convert screen coordinates to canvas coordinates. |
| `flowToScreenPosition(position)` | `XYPosition \| null`     | Convert canvas coordinates to screen coordinates. |
| `getSelectedElements()`          | `string[]`               | IDs of the currently selected elements.           |

### Assessment

| Member                              | Type                               | Purpose                                                     |
| ----------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| `addOrUpdateAssessment(assessment)` | `(Assessment) => void`             | Attach or update a score/feedback assessment on an element. |
| `getInteractiveForSerialization()`  | `InteractiveElements \| undefined` | Interactive-element flags for inclusion in a saved model.   |

## Subscriptions

Every `subscribeTo…` method returns a numeric subscription id. Pass it to
`unsubscribe(id)` to detach. `destroy()` drops all subscriptions automatically.

| Method                               | Callback signature                                  | Fires when                                |
| ------------------------------------ | --------------------------------------------------- | ----------------------------------------- |
| `subscribeToModelChange(cb)`         | `(model: UMLModel) => void`                         | The diagram model changes.                |
| `subscribeToDiagramNameChange(cb)`   | `(title: string) => void`                           | The diagram title changes.                |
| `subscribeToSelectionChange(cb)`     | `(selectedElementIds: string[]) => void`            | The set of selected elements changes.     |
| `subscribeToAssessmentSelection(cb)` | `(selectedElementIds: string[]) => void`            | The assessment selection changes.         |
| `subscribeToAwarenessChanges(cb)`    | `(states: Map<number, CollaborationState>) => void` | Collaborator awareness (cursors) changes. |
| `subscribeToCollaboratorChanges(cb)` | `(collaborators: CollaboratorInfo[]) => void`       | The collaborator roster changes.          |
| `unsubscribe(subscriptionId)`        | `(number) => void`                                  | —                                         |

```ts
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
[Export](/library/api/export) for `ExportOptions` and the PNG/PDF pipeline.

## Diagram types

```ts
type UMLDiagramType =
  | "ClassDiagram"
  | "ObjectDiagram"
  | "ActivityDiagram"
  | "UseCaseDiagram"
  | "CommunicationDiagram"
  | "ComponentDiagram"
  | "DeploymentDiagram"
  | "PetriNet"
  | "ReachabilityGraph"
  | "SyntaxTree"
  | "Flowchart"
  | "BPMN"
  | "Sfc"
```

## Enums

| Enum          | Members                                |
| ------------- | -------------------------------------- |
| `ApollonMode` | `Modelling`, `Exporting`, `Assessment` |
| `ApollonView` | `Modelling`, `Exporting`, `Highlight`  |
| `Locale`      | `en`, `de`                             |

See **[Collaboration](/library/api/collaboration)** for the Yjs hooks and
**[Export](/library/api/export)** for SVG/PNG/PDF/JSON details.
