import { PlaygroundDefaultModel } from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts/EditorContext"
import {
  AssessmentViewData,
  getEdgeAssessmentDataById,
  getNodeAssessmentDataByNodeElementId,
} from "@tumaet/apollon"
import { cn } from "@tumaet/ui/lib/utils"
import React, { useMemo } from "react"

interface Props {
  /** Ids the canvas has selected, from `subscribeToAssessmentSelection`. */
  assessmentSelectedElements: string[]
}

/**
 * The feedback index: every assessment on the diagram, in one list.
 *
 * It demonstrates both directions of the pairing a host needs for a reviewable
 * assessment view. Selecting an element on the canvas marks its entry here
 * (`subscribeToAssessmentSelection`), and choosing an entry sends the canvas to
 * that element and opens its feedback (`revealAssessment`) — so neither half
 * leaves the reader guessing where the other one is pointing.
 */
export const AssessmentDataBox: React.FC<Props> = ({
  assessmentSelectedElements,
}) => {
  const { editor } = useEditorContext()
  const diagram = usePersistenceModelStore(
    (store) => store.models[PlaygroundDefaultModel.id]
  )

  const assessments = useMemo(() => {
    const model = diagram?.model
    if (!model) return []
    const graded = model.assessments ?? {}

    // Walk the DIAGRAM, not the assessments record. That record is keyed by
    // element id in the order a tutor happened to grade things, so reading it
    // directly listed a class's method above the class and its attribute below —
    // an order with no meaning to anyone. Following the model puts every element
    // under the one that contains it, in the order they are drawn.
    const ids: string[] = []
    for (const node of model.nodes ?? []) {
      ids.push(node.id)
      const data = (node.data ?? {}) as Record<string, unknown>
      for (const [key, value] of Object.entries(data)) {
        if (key === "tags" || !Array.isArray(value)) continue
        for (const member of value) {
          if (member && typeof member === "object" && "id" in member) {
            ids.push((member as { id: string }).id)
          }
        }
      }
    }
    for (const edge of model.edges ?? []) ids.push(edge.id)

    return ids
      .filter((id) => id in graded)
      .map(
        (elementId): AssessmentViewData | undefined =>
          getNodeAssessmentDataByNodeElementId(elementId, model) ??
          getEdgeAssessmentDataById(elementId, model)
      )
      .filter((data): data is AssessmentViewData => data !== undefined)
  }, [diagram])

  if (assessments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No feedback yet — score an element to see it listed here.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-semibold">Feedback</span>
      <ul className="flex list-none flex-col gap-1 p-0">
        {assessments.map((data) => {
          const selected = assessmentSelectedElements.includes(data.elementId)
          return (
            <li key={data.elementId}>
              <button
                type="button"
                aria-current={selected}
                onClick={() => editor?.revealAssessment(data.elementId)}
                className={cn(
                  "border-border hover:bg-muted flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left text-sm",
                  selected && "border-primary bg-muted"
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{data.name}</span>
                  <span className="tabular-nums">{data.score}</span>
                </span>
                {data.feedback && (
                  <span className="text-muted-foreground">{data.feedback}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
