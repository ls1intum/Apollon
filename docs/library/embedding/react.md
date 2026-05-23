---
id: react
title: React
description: Embed Apollon in React with the <Apollon> component, hooks, and provider from the /react subpath.
---

# React

Apollon ships a real React component, a context provider, and subscription
hooks. Import them — and everything else — from the **`/react` subpath** so
the editor shares your host's copy of React, MUI, emotion, and xyflow instead
of bundling a second one.

```tsx
import { Apollon } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

export function Diagram() {
  return <Apollon style={{ height: 600 }} />
}
```

That is the whole integration. The component owns the editor's lifecycle: it
constructs the editor on mount and destroys it on unmount. The diagram type
defaults to `ClassDiagram`; pass `defaultType` to start with another.

## Import from `/react`

`<Apollon>` is exported **only** from the `@tumaet/apollon/react` subpath, which
externalises React so the editor shares your host's copy. The default
`@tumaet/apollon` entry is the framework-agnostic build — it bundles its own
React and does not export the component, so importing `<Apollon>` from there is
a compile error. Import the component, the hooks, and the types from
`@tumaet/apollon/react`.

## Reaching the editor instance

The full [`ApollonEditor` API](/library/api) — `model`, `subscribeTo*`,
`exportAsSVG`, `setReadonly`, `fitView`, `setLocalAwarenessCursor`, broadcast,
everything — is reachable through three paths:

1. **`ref` to the instance** — the React-19 ref-as-prop / React-18 forwarded
   ref. `ref.current` is `null` on first render and populated on mount.
2. **`onMount(editor)`** — called once with the instance right after mount.
   May return a cleanup function (React-19 style) that runs before destroy.
3. **`useApollonEditor()`** — context-backed hook for any descendant of
   `<Apollon>` (or `<ApollonProvider>`). Returns `null` until the editor has
   mounted.

```tsx
import { useRef } from "react"
import {
  Apollon,
  useApollonEditor,
  useApollonSubscription,
  type ApollonEditor,
} from "@tumaet/apollon/react"

function Toolbar() {
  const editor = useApollonEditor()
  const selection = useApollonSubscription(
    (e, cb) => e.subscribeToSelectionChange(cb),
    (e) => e.getSelectedElements()
  )
  return (
    <div>
      <button onClick={() => editor?.fitView()}>Fit</button>
      <span>{selection?.length ?? 0} selected</span>
    </div>
  )
}

export function Diagram() {
  const editor = useRef<ApollonEditor | null>(null)
  return (
    <Apollon
      ref={editor}
      style={{ height: 600 }}
      onMount={(e) => {
        // Wire a WebSocket, register a hot-key, etc.
        const ws = new WebSocket("...")
        return () => ws.close() // runs before editor destroys
      }}
    >
      <Toolbar />
    </Apollon>
  )
}
```

## Props

`<Apollon>` props split into two layers — **initial-only** (snapshotted at
mount) and **reactive** (applied via the matching `ApollonEditor` setter when
the prop changes). The reactive layer is what makes the component idiomatic:
toggle `readonly`, switch `view`, swap a preview `model` — no rebuild, no
unmount.

### Container

| Prop        | Type            | Purpose                                                                                   |
| ----------- | --------------- | ----------------------------------------------------------------------------------------- |
| `className` | `string`        | Class on the editor's container `<div>`.                                                  |
| `style`     | `CSSProperties` | Inline styles. **Needs an explicit non-zero height** or the canvas renders blank.         |
| `children`  | `ReactNode`     | Rendered inside the provider alongside the canvas — toolbars, overlays, descendant hooks. |

### Initial-only options (snapshotted on mount)

Touch construction-time wiring (Yjs init, stores, undo manager). Changes to
these props after mount are silently ignored; re-key the component to apply
them to a new editor instance.

| Prop                   | Type             | Effect                                                                                  |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `defaultModel`         | `UMLModel`       | Initial diagram. Use `importDiagram` first if the JSON may be v2/v3.                    |
| `defaultType`          | `UMLDiagramType` | Initial diagram type when no `defaultModel` is supplied.                                |
| `defaultMode`          | `ApollonMode`    | Initial mode — `Modelling`, `Assessment`, or `Exporting`.                               |
| `defaultView`          | `ApollonView`    | Initial view.                                                                           |
| `availableViews`       | `ApollonView[]`  | Views the user may switch between at runtime.                                           |
| `enablePopups`         | `boolean`        | Whether inline edit/property popovers are enabled.                                      |
| `collaborationEnabled` | `boolean`        | Opt into Yjs real-time sync; wire the transport from `onMount`.                         |
| `locale`               | `Locale`         | Accepted for forward compatibility; the editor currently renders in English regardless. |
| `debug`                | `boolean`        | Debug overlays/logging.                                                                 |

### Reactive options (applied via setters when the prop changes)

| Prop          | Type          | Maps to                                                       |
| ------------- | ------------- | ------------------------------------------------------------- |
| `readonly`    | `boolean`     | `editor.setReadonly(value)`                                   |
| `view`        | `ApollonView` | `editor.view = value`                                         |
| `mode`        | `ApollonMode` | `editor.setMode(value)`                                       |
| `scrollLock`  | `boolean`     | `editor.setScrollLock(value)`                                 |
| `previewMode` | `boolean`     | `editor.setPreviewMode(value)` — for version-history overlays |
| `model`       | `UMLModel`    | `editor.model = value` — controlled-model overlay             |

`undefined` resets boolean toggles to `false`; for `view`, `mode`, and `model`
it means "leave the live value alone".

### Lifecycle

| Prop              | Type                               | Purpose                                                                                                  |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `onMount`         | `(editor) => void \| (() => void)` | Fires once with the instance after mount. The optional returned function runs as cleanup before destroy. |
| `onBeforeDestroy` | `(editor) => void`                 | Fires once with the instance right before destroy — last chance to read state.                           |

`onMount` and `onBeforeDestroy` are identity-stable-free: only the latest closure runs.

## Hooks

```ts
useApollonEditor(): ApollonEditor | null
useApollonEditorOrThrow(): ApollonEditor
useApollonSubscription<T>(
  subscribe: (editor: ApollonEditor, cb: (value: T) => void) => number,
  initial: (editor: ApollonEditor) => T,
): T | undefined
```

`useApollonSubscription` is the generic that backs every per-feature
subscription — replace any manual `subscribeTo* + unsubscribe` boilerplate
with one call:

```tsx
const model = useApollonSubscription(
  (editor, cb) => editor.subscribeToModelChange(cb),
  (editor) => editor.model
)

const collaborators = useApollonSubscription(
  (editor, cb) => editor.subscribeToCollaboratorChanges(cb),
  (editor) => editor.getCollaborators()
)
```

## Providing an externally-owned editor

If the host owns the `ApollonEditor` lifecycle directly (a framework adapter,
a non-React harness, a test fixture) but you still want React descendants to
reach the instance, wrap them in `<ApollonProvider>`:

```tsx
import { ApollonProvider } from "@tumaet/apollon/react"

;<ApollonProvider editor={instance}>
  <Toolbar />
</ApollonProvider>
```

`useApollonEditor()` will return `instance` for any child.

## The container needs an explicit height

The editor's canvas sizes itself to its container. Give the container an
explicit, non-zero height through `style` — `{ height: 600 }`, or
`{ height: "100%" }` only when every ancestor is itself sized. Without it the
canvas collapses to zero pixels and renders blank. See
[Troubleshooting](/library/troubleshooting).

## SSR (Next.js, Remix, Nuxt, SvelteKit)

The editor is client-only — it touches `window` at construction. In SSR
frameworks, load `<Apollon>` client-side only. In the Next.js App Router:

```tsx
"use client"
import dynamic from "next/dynamic"

const Diagram = dynamic(() => import("./Diagram"), { ssr: false })

export default function Page() {
  return <Diagram />
}
```

Remix and Nuxt have equivalent client-only loading. See
[Troubleshooting](/library/troubleshooting) for the full SSR guidance.

## Imperative mounting — for full lifecycle control

You do not need this for most apps. Reach for it when you want to own editor
construction yourself — to decide exactly when the editor is created, to keep
a long-lived `ApollonEditor` reference across renders, or to integrate with
non-React lifecycle code.

```tsx
"use client"
import { useEffect, useRef } from "react"
import { ApollonEditor, UMLDiagramType } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

export function DiagramEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<ApollonEditor | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    editorRef.current = new ApollonEditor(containerRef.current, {
      type: UMLDiagramType.ClassDiagram,
    })

    return () => {
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ width: "100%", height: 600 }} />
}
```

The same rules apply: import `ApollonEditor` from `@tumaet/apollon/react`, give
the container an explicit height, and always `destroy()` on unmount before the
container is removed.
