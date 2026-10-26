import { describe, expect, it } from "vitest"
import type { DragEvent, ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import * as Y from "yjs"
import type { Assessment } from "@/typings"
import { DEFAULT_LABELS, mergeLabels } from "@/i18n/labels"
import { DiagramStoreContext, MetadataStoreContext } from "@/store/context"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { useDropFeedback } from "@/hooks/useDropFeedback"

const t = mergeLabels(DEFAULT_LABELS)

const drop = (existing: Partial<Assessment> | undefined, data: string) => {
  const diagramStore = createDiagramStore(new Y.Doc())
  if (existing) {
    diagramStore.getState().setAssessments({
      element: {
        modelElementId: "element",
        elementType: "node",
        score: 0,
        ...existing,
      },
    })
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DiagramStoreContext value={diagramStore}>
      <MetadataStoreContext value={createMetadataStore(new Y.Doc())}>
        {children}
      </MetadataStoreContext>
    </DiagramStoreContext>
  )
  const { result } = renderHook(
    () => useDropFeedback({ elementId: "element", elementType: "node" }),
    { wrapper }
  )
  act(() =>
    result.current({
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: { getData: () => data },
    } as unknown as DragEvent<HTMLDivElement>)
  )
  return diagramStore.getState().assessments.element
}

describe("useDropFeedback", () => {
  it("lets a default title follow the instruction's points", () => {
    const linked = drop(
      { score: 2, title: t.positiveFeedback },
      JSON.stringify({ id: 7, credits: -1 })
    )

    expect(linked.score).toBe(-1)
    expect(linked.title).toBeUndefined()
  })

  it("keeps a typed title", () => {
    const linked = drop(
      { score: 2, title: "Association" },
      JSON.stringify({ id: 7, credits: -1 })
    )

    expect(linked.title).toBe("Association")
  })

  it.each([
    ["plain text", "hello"],
    ["other JSON", '{"source":"host"}'],
  ])("ignores a drop of %s", (_name, data) => {
    expect(drop(undefined, data)).toBeUndefined()
  })
})
