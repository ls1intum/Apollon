import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import { ApollonEditor } from "@tumaet/apollon"
import React, { useEffect, useRef } from "react"
import { useParams } from "react-router"
import { log } from "@/logger"
import { ErrorPage } from "./ErrorPage"

export const ApollonLocal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { setEditor } = useEditorContext()
  const { id: diagramId } = useParams()
  const diagram = usePersistenceModelStore((store) =>
    diagramId ? store.models[diagramId] : null
  )
  const updateModel = usePersistenceModelStore((store) => store.updateModel)

  useEffect(() => {
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
      setEditor(undefined)
    }
  }, [diagram?.id, setEditor, updateModel])

  if (!diagramId || !diagram) {
    return <ErrorPage message="Diagram not found." buttonLabel="Back to Home" />
  }

  return (
    <div
      style={{ display: "flex", flexGrow: 1, height: "100%" }}
      ref={containerRef}
    />
  )
}
