import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import {
  Apollon,
  UMLDiagramType,
  type ApollonEditor,
} from "@tumaet/apollon/react"
import React, { useEffect } from "react"
import { useLocation } from "react-router"

/**
 * Local (non-collaborative) editor mount.
 *
 * Uses the `<Apollon>` React component: the component owns the editor
 * lifecycle, the `key` triggers a fresh mount whenever the active diagram
 * changes (or the router pushes a `timeStapToCreate` to request a
 * recreate), and `onMount` wires the editor into the shared
 * `EditorContext` plus a model-change subscription that flows changes back
 * into the persistence store.
 */
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

  // Bootstrap a default diagram if there isn't one yet. The editor only
  // renders once a diagram exists.
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
      // Re-key when the active diagram identity changes or the router asks
      // for a fresh editor — both are "I want a new editor" signals, and
      // re-keying is the canonical way to ask `<Apollon>` to rebuild.
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
