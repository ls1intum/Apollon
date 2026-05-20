---
id: api
title: API
description: The `ApollonEditor` surface — constructor options, lifecycle, and subscriptions.
---

# API

```ts
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const editor = new ApollonEditor(container, {
  type: UMLDiagramType.ClassDiagram,
  mode: ApollonMode.Modelling,
  locale: Locale.en,
})
```

## Lifecycle

| Method | Purpose |
|---|---|
| `new ApollonEditor(container, options)` | Mount the editor's React tree into `container` |
| `editor.destroy()` | Unmount cleanly. Always call before tearing down the host container. |

## State

| Member | Type | Purpose |
|---|---|---|
| `editor.model` | `UMLModel` (getter / setter) | Read or replace the current diagram model |
| `editor.subscribeToModelChange(cb)` | `(model: UMLModel) => void` → `number` (subscription id) | Observe model mutations |
| `editor.unsubscribe(subscriptionId)` | — | Drop a subscription |

## Diagram types

```ts
type UMLDiagramType =
  | "ClassDiagram"
  | "ObjectDiagram"
  | "ComponentDiagram"
  | "DeploymentDiagram"
  | "Flowchart"
  | "SyntaxTree"
  | "ActivityDiagram"
  | "UseCaseDiagram"
  | "CommunicationDiagram"
  | "PetriNet"
  | "ReachabilityGraph"
  | "BPMN"
  | "Sfc"
```

Full type definitions ship with the package in `dist/index.d.ts`. See **[Collaboration](api/collaboration)** for the Yjs hooks and **[Export](api/export)** for SVG/PNG/PDF/JSON.
