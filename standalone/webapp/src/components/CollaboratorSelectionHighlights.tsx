import { useEditorContext } from "@/contexts"
import { useThemeStore } from "@/stores/useThemeStore"
import { CollaborationState } from "@tumaet/apollon"
import { useEffect, useRef, type RefObject } from "react"

type CollaboratorSelectionHighlightsProps = {
  containerRef: RefObject<HTMLDivElement>
  isActive: boolean
}

const HIGHLIGHT_COLORS = {
  light: "#00a6ff",
  dark: "#34f5ff",
} as const

const tryHighlightElement = (
  container: HTMLElement,
  elementId: string,
  highlightColor: string
): boolean => {
  const escapedId = CSS.escape(elementId)
  const nodeElement = container.querySelector<HTMLElement>(
    `.react-flow__node[data-id="${escapedId}"]`
  )

  if (nodeElement) {
    nodeElement.style.setProperty(
      "box-shadow",
      `0 0 0 4px ${highlightColor}, 0 0 16px 3px ${highlightColor}`
    )
    nodeElement.style.setProperty("border-color", highlightColor)
    return true
  }

  const edgeElement = container.querySelector<HTMLElement>(
    `.react-flow__edge[data-id="${escapedId}"]`
  )

  if (edgeElement) {
    const edgePaths = edgeElement.querySelectorAll<SVGPathElement>("path")
    edgePaths.forEach((path) => {
      path.style.setProperty("stroke", highlightColor)
      path.style.setProperty("stroke-width", "4.5")
      path.style.setProperty("filter", `drop-shadow(0 0 4px ${highlightColor})`)
    })
    return true
  }

  return false
}

const clearHighlights = (container: HTMLElement, elementIds: Set<string>) => {
  for (const elementId of elementIds) {
    const escapedId = CSS.escape(elementId)
    const nodeElement = container.querySelector<HTMLElement>(
      `.react-flow__node[data-id="${escapedId}"]`
    )
    if (nodeElement) {
      nodeElement.style.removeProperty("box-shadow")
      nodeElement.style.removeProperty("border-color")
    }

    const edgeElement = container.querySelector<HTMLElement>(
      `.react-flow__edge[data-id="${escapedId}"]`
    )
    edgeElement?.querySelectorAll<SVGPathElement>("path").forEach((path) => {
      path.style.removeProperty("stroke")
      path.style.removeProperty("stroke-width")
      path.style.removeProperty("filter")
    })
  }
}

export const CollaboratorSelectionHighlights = ({
  containerRef,
  isActive,
}: CollaboratorSelectionHighlightsProps) => {
  const { editor } = useEditorContext()
  const currentTheme = useThemeStore((state) => state.currentTheme)
  const highlightedIdsRef = useRef<Set<string>>(new Set())
  const highlightColor =
    currentTheme === "dark" ? HIGHLIGHT_COLORS.dark : HIGHLIGHT_COLORS.light

  useEffect(() => {
    if (!editor || !isActive || !containerRef.current) {
      if (containerRef.current) {
        clearHighlights(containerRef.current, highlightedIdsRef.current)
      }
      highlightedIdsRef.current = new Set()
      return
    }

    const container = containerRef.current
    const subscriptionId = editor.subscribeToAwarenessChanges((states) => {
      const localClientId = editor.getLocalAwarenessClientId()
      const nextHighlightedIds = new Set<string>()

      for (const [clientId, state] of states.entries()) {
        if (clientId === localClientId) {
          continue
        }

        const typedState = state as CollaborationState
        const selectedElementId = typedState?.selectedElementId
        if (selectedElementId) {
          nextHighlightedIds.add(selectedElementId)
        }
      }

      clearHighlights(container, highlightedIdsRef.current)

      const actuallyHighlighted = new Set<string>()
      for (const elementId of nextHighlightedIds) {
        if (tryHighlightElement(container, elementId, highlightColor)) {
          actuallyHighlighted.add(elementId)
        }
      }

      highlightedIdsRef.current = actuallyHighlighted
    })

    return () => {
      editor.unsubscribe(subscriptionId)
      clearHighlights(container, highlightedIdsRef.current)
      highlightedIdsRef.current = new Set()
    }
  }, [containerRef, editor, isActive, highlightColor])

  return null
}
