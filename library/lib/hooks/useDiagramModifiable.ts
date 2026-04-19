import { useMetadataStore } from "@/store"
import { ApollonMode, ApollonView } from "@/typings"
import { useMemo } from "react"
import { useShallow } from "zustand/shallow"

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
      diagramMode === ApollonMode.Modelling &&
      diagramView === ApollonView.Modelling &&
      !readonlyDiagram,
    [diagramMode, diagramView, readonlyDiagram]
  )

  return isDiagramUpdatable
}
