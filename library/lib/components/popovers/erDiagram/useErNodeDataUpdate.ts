import { useCallback } from "react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"

/**
 * Returns a callback that shallow-merges a partial data patch into the node's
 * `data`. Shared by the ER node popovers (entity kind, relationship kind,
 * attribute flags).
 */
export const useErNodeDataUpdate = (elementId: string) => {
  const setNodes = useDiagramStore(useShallow((state) => state.setNodes))

  return useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === elementId
            ? { ...node, data: { ...node.data, ...patch } }
            : node
        )
      )
    },
    [elementId, setNodes]
  )
}
