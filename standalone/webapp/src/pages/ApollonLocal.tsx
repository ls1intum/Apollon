import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import {
  Apollon,
  UMLDiagramType,
  type ApollonEditor,
} from "@tumaet/apollon/react"
import React, { useEffect } from "react"
import { useLocation } from "react-router"

/** Local (non-collaborative) editor mount. */
export const ApollonLocal: React.FC = () => {
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
    }
  }, [diagram, createModelByTitleAndType])

  if (!diagram) {
    return <div style={{ display: "flex", flexGrow: 1, height: "100%" }} />
  }

  return (
    <Apollon
      key={`${diagram.id}|${state?.timeStapToCreate ?? ""}`}
      defaultModel={diagram.model}
      style={{ display: "flex", flexGrow: 1, height: "100%" }}
      onMount={(editor: ApollonEditor) => {
        setEditor(editor)
        const subscriberId = editor.subscribeToModelChange((model) =>
          updateModel(model)
        )
        return () => {
          editor.unsubscribe(subscriberId)
          setEditor(undefined)
        }
      }}
    />
  )
}
