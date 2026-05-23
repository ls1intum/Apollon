---
id: react
title: React
description: Embed Apollon in React with the <Apollon> component from the /react subpath.
---

# React

Apollon ships a real React component. Import it — and everything else — from
the **`/react` subpath** so the editor shares your host's copy of React, MUI,
emotion, and xyflow instead of bundling a second one.

```tsx
import { Apollon, UMLDiagramType } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

export function Diagram() {
  return <Apollon type={UMLDiagramType.ClassDiagram} style={{ height: 600 }} />
}
```

That is the whole integration. The component owns the editor's lifecycle: it
constructs the editor on mount and destroys it on unmount.

## Import from `/react`

`<Apollon>` is exported **only** from the `@tumaet/apollon/react` subpath, which
externalizes React so the editor shares your host's copy. The default
`@tumaet/apollon` entry is the framework-agnostic build — it bundles its own
React and does not export the component, so importing `<Apollon>` from there is
a compile error. Import the component, and everything else, from
`@tumaet/apollon/react`.

## Props

`ApollonProps` extends `ApollonOptions` — every editor option (`type`, `mode`,
`view`, `readonly`, `model`, and the rest) is accepted as a prop. Plus three
component-only props:

| Prop        | Type                              | Purpose                                                               |
| ----------- | --------------------------------- | --------------------------------------------------------------------- |
| `style`     | `CSSProperties`                   | Inline styles for the editor's container `<div>`.                     |
| `className` | `string`                          | Class name for the editor's container `<div>`.                        |
| `onReady`   | `(editor: ApollonEditor) => void` | Called once after mount with the underlying `ApollonEditor` instance. |

See [API reference](/library/api) for the full `ApollonProps` table.

### The container needs an explicit height

The editor's canvas sizes itself to its container. Give the container an
explicit, non-zero height through `style` — `{ height: 600 }`, or
`{ height: "100%" }` only when every ancestor is itself sized. Without it the
canvas collapses to zero pixels and renders blank. See
[Troubleshooting](/library/troubleshooting).

## Props are initial values

All `ApollonOptions` props are read **once, at mount**. Changing `readonly`,
`model`, `locale`, or any other option prop after mount does **not** update the
live editor — the component does not rebuild the editor on prop changes.

To change the live diagram, drive the imperative `ApollonEditor` instance handed
to `onReady`:

```tsx
import { Apollon, UMLDiagramType } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

export function Diagram() {
  return (
    <Apollon
      type={UMLDiagramType.ClassDiagram}
      style={{ height: 600 }}
      onReady={(editor) => {
        const id = editor.subscribeToModelChange((model) => persist(model))
        // editor.unsubscribe(id) when you no longer need it
      }}
    />
  )
}
```

`onReady` is the bridge to the entire imperative API: exporting, replacing the
model, toggling read-only, subscribing to changes. See
[API reference](/library/api) for the `ApollonEditor` surface.

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
construction yourself — to decide exactly when the editor is created, to keep a
long-lived `ApollonEditor` reference across renders, or to integrate with
non-React lifecycle code.

```tsx
"use client"
import { useEffect, useRef } from "react"
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

export function DiagramEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<ApollonEditor | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    editorRef.current = new ApollonEditor(containerRef.current, {
      type: UMLDiagramType.ClassDiagram,
      mode: ApollonMode.Modelling,
      locale: Locale.en,
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
