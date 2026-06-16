import { useReactFlow, useStore } from "@xyflow/react"

/**
 * Reactive single-edge / single-node reads for edit popovers. Popovers must
 * subscribe to the element they edit (rather than reading getEdge/getNode
 * imperatively during render) so they re-render on data changes — swap, a
 * collaborator's edit, re-selection. Without this the React Compiler memoizes
 * the popover render and its controls show stale values.
 */
export function useReactiveEdge(id: string) {
  return useStore((s) => s.edgeLookup.get(id))
}

export function useReactiveNode(id: string) {
  return useStore((s) => s.nodeLookup.get(id))
}

export function useReactiveNodeName(
  id: string | undefined,
  fallback: string
): string {
  return useStore(
    (s) => (id && (s.nodeLookup.get(id)?.data?.name as string)) || fallback
  )
}

export function useEdgePopOver(id: string) {
  const reactFlow = useReactFlow()

  const handleEdgeTypeChange = (newType: string) => {
    const currentEdge = reactFlow.getEdge(id)
    const currentData = currentEdge?.data || {}

    if (
      currentEdge?.type === "UseCaseAssociation" &&
      newType !== "UseCaseAssociation"
    ) {
      reactFlow.updateEdge(id, {
        type: newType,
        data: {
          ...currentData,
          savedLabel: currentData.label,
          label: undefined,
        },
      })
    } else if (
      currentEdge?.type !== "UseCaseAssociation" &&
      newType === "UseCaseAssociation"
    ) {
      reactFlow.updateEdge(id, {
        type: newType,
        data: {
          ...currentData,
          label: currentData.savedLabel || "",
        },
      })
    } else {
      reactFlow.updateEdge(id, { type: newType })
    }
  }

  const handleSwap = () => {
    const edge = reactFlow.getEdge(id)
    reactFlow.updateEdge(id, {
      source: edge?.target,
      sourceHandle: edge?.targetHandle,
      target: edge?.source,
      targetHandle: edge?.sourceHandle,
    })
  }

  const handleTargetRoleChange = (newRole: string) => {
    reactFlow.updateEdgeData(id, { targetRole: newRole })
  }

  const handleTargetMultiplicityChange = (newMultiplicity: string) => {
    reactFlow.updateEdgeData(id, { targetMultiplicity: newMultiplicity })
  }

  const handleSourceRoleChange = (newRole: string) => {
    reactFlow.updateEdgeData(id, { sourceRole: newRole })
  }

  const handleSourceMultiplicityChange = (newMultiplicity: string) => {
    reactFlow.updateEdgeData(id, { sourceMultiplicity: newMultiplicity })
  }

  const handleLabelChange = (newLabel: string) => {
    reactFlow.updateEdgeData(id, { label: newLabel })
  }

  return {
    handleSourceRoleChange,
    handleSourceMultiplicityChange,
    handleTargetRoleChange,
    handleTargetMultiplicityChange,
    handleEdgeTypeChange,
    handleLabelChange,
    handleSwap,
  }
}
