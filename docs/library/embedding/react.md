---
id: react
title: React
description: Embed Apollon in React with the <Apollon> component, hooks, and provider.
---

# React

Apollon ships a React component, a context provider, and subscription hooks
from the **`/react` subpath** so the editor shares your host's copy of React
and xyflow instead of bundling a second one.

```tsx
import { Apollon } from "@tumaet/apollon"
import type { UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

export function Diagram({ initialModel }: { initialModel?: UMLModel }) {
  return (
    <Apollon
      style={{ height: 600 }}
      defaultModel={initialModel}
      onMount={(editor) => {
        const id = editor.subscribeToModelChange((model) => {
          localStorage.setItem("diagram", JSON.stringify(model))
        })
        return () => editor.unsubscribe(id)
      }}
    />
  )
}
```

The component owns the editor's lifecycle — constructs on mount, destroys on
unmount. The `onMount` return is the React-19-style cleanup that runs before
destroy. The diagram type defaults to `ClassDiagram` when no `defaultModel` is
supplied; pass `defaultType` for a different one.

## Import from `/react`

`<Apollon>`, the hooks, and the provider are exported from `@tumaet/apollon`.
The editor externalises React, so the component renders on your host's own React
copy — there is no second React instance. Non-React hosts that import only the
imperative `ApollonEditor` tree-shake the component out automatically.

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
} from "@tumaet/apollon"

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

The full table — every prop, its type, and what it maps to — lives in the
[API reference](/library/api#apollonprops). Passing `undefined` to a reactive
prop leaves the live value alone; re-key the component to fully reset.

## Hooks

```ts
useApollonEditor(): ApollonEditor | null
useApollonEditorOrThrow(): ApollonEditor
useApollonSubscription<T>(
  subscribe: (editor: ApollonEditor, cb: (value: T) => void) => number,
  getSnapshot: (editor: ApollonEditor) => T,
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
import { ApollonProvider } from "@tumaet/apollon"
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

Remix and Nuxt have equivalent client-only loading.

Non-React hosts that want imperative control mount `ApollonEditor` directly —
see [Vanilla JS / CDN](/library/embedding/vanilla).
