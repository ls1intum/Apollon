import { useCallback } from "react"
import { useDiagramStore } from "@/store"
import { Edge, Connection } from "@xyflow/react"

export const useReconnect = () => {
  const setEdges = useDiagramStore((state) => state.setEdges)
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const updatedEdge = {
        ...oldEdge,
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle || oldEdge.sourceHandle,
        targetHandle: newConnection.targetHandle || oldEdge.targetHandle,
        data: oldEdge.data,
      }

      setEdges((edges) =>
        edges.map((edge) => (edge.id === oldEdge.id ? updatedEdge : edge))
      )
    },
    [setEdges]
  )
  return onReconnect
}
