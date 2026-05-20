---
id: react
title: React
description: Embed Apollon in a React host using the `/react` subpath to dedupe React.
---

# React

Use the **`/react` subpath**. Your final bundle keeps a single copy of React, MUI, emotion, and xyflow shared with the editor.

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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
}
```

## SSR (Next.js, Remix, Nuxt, SvelteKit)

The editor is client-only. Construct inside `useEffect`, or import the wrapper via `dynamic(() => import("./DiagramEditor"), { ssr: false })` in Next.js App Router.
