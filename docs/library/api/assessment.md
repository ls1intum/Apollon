---
id: assessment
title: Assessment & read-only
description: Render a non-editable diagram, attach scores and feedback to elements, highlight elements, and react to the element being assessed.
---

# Assessment & read-only

Apollon has a grading workflow on top of the editor: switch the editor into
**assessment mode**, attach a score and feedback to individual diagram elements,
highlight elements, and subscribe to which element the grader selected. The same
`readonly` switch also gives you a plain non-editable **viewer**. This is the
workflow [Artemis](https://artemis.tum.de/) uses to grade modeling exercises.

## Read-only viewer

Pass `readonly` to render a diagram nobody can edit — for previews, summaries,
or a graded result.

```tsx
import { Apollon, type UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

export function DiagramViewer({ model }: { model: UMLModel }) {
  return <Apollon readonly defaultModel={model} style={{ height: 400 }} />
}
```

Imperatively, it's the `readonly` constructor option (toggle later with
`editor.setReadonly(true)`):

```ts
import { ApollonEditor, type UMLModel } from "@tumaet/apollon"

function mountViewer(container: HTMLElement, model: UMLModel) {
  return new ApollonEditor(container, { model, readonly: true })
}
```

## Assessment mode

Construct the editor in `ApollonMode.Assessment` (or call
`editor.setMode(ApollonMode.Assessment)` later), then attach an `Assessment` to
each element you grade with `addOrUpdateAssessment`.

```ts
import { ApollonEditor, ApollonMode, type Assessment } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const container = document.getElementById("apollon")
if (!container) throw new Error("#apollon container missing")

const editor = new ApollonEditor(container, { mode: ApollonMode.Assessment })

const assessment: Assessment = {
  modelElementId: "node-1",
  elementType: "Class",
  score: 2,
  feedback: "Good — but the association multiplicity is missing.",
}
editor.addOrUpdateAssessment(assessment)

// Assessments live on the model, keyed by element id:
const all: Record<string, Assessment> = editor.model.assessments
```

### The `Assessment` shape

| Field              | Type                                                                             | Notes                                                 |
| ------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `modelElementId`   | `string`                                                                         | The diagram element this assessment grades. Required. |
| `elementType`      | `string`                                                                         | The element's type (e.g. `"Class"`). Required.        |
| `score`            | `number`                                                                         | Points awarded. Required.                             |
| `feedback`         | `string?`                                                                        | Free-text feedback.                                   |
| `label`            | `string?`                                                                        | Short label shown on the element.                     |
| `labelColor`       | `string?`                                                                        | CSS color for the label.                              |
| `correctionStatus` | `{ status: "CORRECT" \| "INCORRECT" \| "NOT_VALIDATED"; description?: string }?` | For automated/suggested feedback review.              |

## Highlight elements

`setElementHighlights` tints elements by id with a CSS color — e.g. to mark the
elements that still need feedback. Use **translucent** colors so the element's
own text stays readable. Highlights are ephemeral: they are not serialized into
the model and not shared over collaboration. Pass `null` or an empty map to clear.

```ts
import { ApollonEditor } from "@tumaet/apollon"

function highlightMissing(editor: ApollonEditor) {
  editor.setElementHighlights(
    new Map([
      ["node-2", "rgba(0, 123, 255, 0.35)"],
      ["node-5", "rgba(0, 123, 255, 0.35)"],
    ])
  )
}
```

## React to the element being assessed

`subscribeToAssessmentSelection` fires with the ids of the elements the grader
selected, so you can show the matching feedback form. Like every `subscribeTo*`
method it returns a numeric id you pass to `editor.unsubscribe` to tear down.

```ts
import { ApollonEditor } from "@tumaet/apollon"

function watchAssessmentSelection(editor: ApollonEditor) {
  const subId = editor.subscribeToAssessmentSelection((selectedElementIds) => {
    // open the feedback form for selectedElementIds[0], etc.
    console.log("assessing", selectedElementIds)
  })
  return () => editor.unsubscribe(subId)
}
```

## See also

- [Model contract](/library/api/model-contract) — the `UMLModel` and `Assessment` shapes in full.
- [Overlay controls](/library/api/overlay-controls) — inject a feedback panel into the editor canvas.
