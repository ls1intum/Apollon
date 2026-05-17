import { useCallback } from "react"
import { useDiagramStore } from "@/store"
import { Edge, Connection } from "@xyflow/react"

function stripComputedSegments(data: Edge["data"]): Edge["data"] {
  if (!data) return data

  const persistedData = { ...(data as Record<string, unknown>) }
  delete persistedData.computedSegments
  return persistedData
}

export const useReconnect = () => {
  const setEdges = useDiagramStore((state) => state.setEdges)
  const onReconnect = useCallback(
    (
      oldEdge: Edge,
      newConnection: Connection,
      data: Edge["data"] = oldEdge.data
    ) => {
      const updatedEdge = {
        ...oldEdge,
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle || oldEdge.sourceHandle,
        targetHandle: newConnection.targetHandle || oldEdge.targetHandle,
        data: stripComputedSegments(data),
      }

      setEdges((edges) =>
        edges.map((edge) => (edge.id === oldEdge.id ? updatedEdge : edge))
      )
    },
    [setEdges]
  )
  return onReconnect
}
