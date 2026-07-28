import { useMetadataStore } from "@/store"
import { ApollonMode, ApollonView } from "@/typings"
import { useMemo } from "react"
import { useShallow } from "zustand/shallow"

export const isDiagramStateModifiable = ({
  readonly,
  mode,
  view,
}: {
  readonly: boolean
  mode: ApollonMode
  view: ApollonView
}): boolean =>
  mode === ApollonMode.Modelling && view === ApollonView.Modelling && !readonly

export const useDiagramModifiable = () => {
  const { readonlyDiagram, diagramMode, diagramView } = useMetadataStore(
    useShallow((state) => ({
      readonlyDiagram: state.readonly,
      diagramMode: state.mode,
      diagramView: state.view,
    }))
  )

  const isDiagramUpdatable = useMemo(
    () =>
      isDiagramStateModifiable({
        readonly: readonlyDiagram,
        mode: diagramMode,
        view: diagramView,
      }),
    [diagramMode, diagramView, readonlyDiagram]
  )

  return isDiagramUpdatable
}
