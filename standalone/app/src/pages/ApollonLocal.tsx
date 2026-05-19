import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import { ApollonEditor, UMLDiagramType } from "@tumaet/apollon"
import React, { useEffect, useRef } from "react"
import { useLocation } from "react-router"
import { log } from "@/logger"

export const ApollonLocal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { setEditor } = useEditorContext()
  const { state } = useLocation()

  const currentModelId = usePersistenceModelStore(
    (store) => store.currentModelId
  )
  const diagram = usePersistenceModelStore((store) =>
    currentModelId ? store.models[currentModelId] : null
  )
  const createModelByTitleAndType = usePersistenceModelStore(
    (store) => store.createModelByTitleAndType
  )
  const updateModel = usePersistenceModelStore((store) => store.updateModel)

  useEffect(() => {
    if (!diagram) {
      createModelByTitleAndType("Class Diagram", UMLDiagramType.ClassDiagram)
      return
    }

    if (!containerRef.current || !diagram) return

    const instance = new ApollonEditor(containerRef.current, {
      model: diagram.model,
    })

    instance.subscribeToModelChange((model) => {
      updateModel(model)
    })

    setEditor(instance)

    return () => {
      log.debug("Cleaning up Apollon instance")
      instance.destroy()
    }
  }, [diagram?.id, state?.timeStapToCreate])

  return (
    <div
      style={{ display: "flex", flexGrow: 1, height: "100%" }}
      ref={containerRef}
    />
  )
}
