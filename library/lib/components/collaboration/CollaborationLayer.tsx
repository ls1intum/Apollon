import Tooltip from "@mui/material/Tooltip"
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useReactFlow, useViewport } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { useDiagramStore } from "@/store"
import {
  CollaborationCursor,
  CollaborationState,
  CollaborationUser,
  CollaboratorInfo,
} from "@/typings"

export type CollaborationAwarenessApi = {
  setLocalAwarenessCursor: (cursor: CollaborationCursor | null) => void
  setLocalAwarenessSelectedElement: (selectedElementId: string | null) => void
  subscribeToAwarenessChanges: (
    callback: (states: Map<number, CollaborationState>) => void
  ) => () => void
  subscribeToCollaboratorChanges: (
    callback: (collaborators: CollaboratorInfo[]) => void
  ) => () => void
  getLocalAwarenessClientId: () => number
}

export type CollaborationLayerOptions = {
  enabled: boolean
  user?: CollaborationUser
  showPresence: boolean
  showCursors: boolean
  showSelectionHighlights: boolean
}

type CollaborationLayerProps = {
  options: CollaborationLayerOptions
  awareness: CollaborationAwarenessApi
}

type RemoteCursor = {
  clientId: number
  name: string
  color: string
  x: number
  y: number
}

const AVATAR_SIZE = 26
const OVERLAP = -6

const avatarBase: CSSProperties = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "default",
  flexShrink: 0,
}

const cssEscape = (value: string) => {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, "\\$&")
}

const getElementTargets = (container: HTMLElement, elementId: string) => {
  const escapedId = cssEscape(elementId)
  return [
    container.querySelector<HTMLElement>(
      `.react-flow__node[data-id="${escapedId}"]`
    ),
    container.querySelector<HTMLElement>(
      `.react-flow__edge[data-id="${escapedId}"]`
    ),
  ].filter((element): element is HTMLElement => Boolean(element))
}

const clearHighlights = (container: HTMLElement, elementIds: Set<string>) => {
  for (const elementId of elementIds) {
    for (const target of getElementTargets(container, elementId)) {
      target.classList.remove("apollon-collaboration-highlighted")
      target.style.removeProperty("--apollon-collaboration-highlight-color")
    }
  }
}

function CollaboratorPresenceBar({
  active,
  awareness,
}: {
  active: boolean
  awareness: CollaborationAwarenessApi
}) {
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([])

  useEffect(() => {
    if (!active) {
      setCollaborators([])
      return
    }

    const unsubscribe =
      awareness.subscribeToCollaboratorChanges(setCollaborators)

    return unsubscribe
  }, [active, awareness])

  const remoteCount = collaborators.filter((c) => !c.isLocal).length
  if (!active || remoteCount === 0) return null

  return (
    <div className="apollon-collaboration-presence-bar">
      {collaborators.map((c, i) => (
        <Tooltip
          key={c.id}
          title={c.isLocal ? `${c.name} (You)` : c.name}
          arrow
          slotProps={{
            popper: {
              modifiers: [{ name: "offset", options: { offset: [0, -4] } }],
            },
          }}
        >
          <div
            aria-label={c.isLocal ? `${c.name} (You)` : c.name}
            style={{
              ...avatarBase,
              backgroundColor: c.color,
              border: "2px solid var(--apollon-background)",
              marginLeft: i === 0 ? 0 : OVERLAP,
              zIndex: collaborators.length - i,
            }}
          >
            {c.name.charAt(0).toUpperCase()}
          </div>
        </Tooltip>
      ))}
    </div>
  )
}

function CollaboratorCursors({
  active,
  awareness,
}: {
  active: boolean
  awareness: CollaborationAwarenessApi
}) {
  const reactFlow = useReactFlow()
  useViewport()
  const [collaborators, setCollaborators] = useState<RemoteCursor[]>([])

  useEffect(() => {
    if (!active) {
      setCollaborators([])
      return
    }

    const unsubscribe = awareness.subscribeToAwarenessChanges((states) => {
      const localClientId = awareness.getLocalAwarenessClientId()
      const next = Array.from(states.entries()).flatMap(([clientId, state]) => {
        if (clientId === localClientId) return []

        const cursor = state?.cursor
        const user = state?.user
        if (!cursor || !user) return []

        return [
          {
            clientId,
            name: user.name,
            color: user.color,
            x: cursor.x,
            y: cursor.y,
          },
        ]
      })

      setCollaborators(next)
    })

    return unsubscribe
  }, [active, awareness])

  if (!active) return null

  return (
    <div className="apollon-collaboration-cursors">
      {collaborators.map((collaborator) => {
        const screenPosition = reactFlow.flowToScreenPosition({
          x: collaborator.x,
          y: collaborator.y,
        })

        return (
          <div
            key={collaborator.clientId}
            className="apollon-collaboration-cursor"
            style={{
              left: screenPosition.x,
              top: screenPosition.y,
            }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              style={{ display: "block" }}
            >
              <path
                d="M2 1L2 18L6.5 13.8L9.5 19L12 17.7L9 12.6L15 12.2L2 1Z"
                fill={collaborator.color}
                stroke="#ffffff"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="apollon-collaboration-cursor-label"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LocalCollaborationAwareness({
  active,
  options,
  awareness,
}: {
  active: boolean
  options: CollaborationLayerOptions
  awareness: CollaborationAwarenessApi
}) {
  const reactFlow = useReactFlow()
  const selectedElementIds = useDiagramStore(
    (state) => state.selectedElementIds
  )
  const diagramId = useDiagramStore((state) => state.diagramId)

  useEffect(() => {
    if (!active || !options.showCursors) {
      awareness.setLocalAwarenessCursor(null)
      return
    }

    const container = document.getElementById(`react-flow-library-${diagramId}`)
    if (!container) return

    const rafRef = { current: 0 }
    const pendingRef = {
      current: null as CollaborationCursor | null,
    }

    const flushCursor = () => {
      if (pendingRef.current) {
        awareness.setLocalAwarenessCursor(pendingRef.current)
        pendingRef.current = null
      }
      rafRef.current = 0
    }

    const handlePointerMove = (event: PointerEvent) => {
      const flowPosition = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      pendingRef.current = {
        x: flowPosition.x,
        y: flowPosition.y,
      }

      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flushCursor)
      }
    }

    const handlePointerLeave = () => {
      awareness.setLocalAwarenessCursor(null)
    }

    container.addEventListener("pointermove", handlePointerMove)
    container.addEventListener("pointerleave", handlePointerLeave)

    return () => {
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("pointerleave", handlePointerLeave)
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
      awareness.setLocalAwarenessCursor(null)
    }
  }, [active, awareness, diagramId, options.showCursors, reactFlow])

  useEffect(() => {
    if (!active || !options.showSelectionHighlights) {
      awareness.setLocalAwarenessSelectedElement(null)
      return
    }

    awareness.setLocalAwarenessSelectedElement(
      selectedElementIds.at(-1) ?? null
    )

    return () => {
      awareness.setLocalAwarenessSelectedElement(null)
    }
  }, [active, awareness, options.showSelectionHighlights, selectedElementIds])

  return null
}

function CollaboratorSelectionHighlights({
  active,
  awareness,
}: {
  active: boolean
  awareness: CollaborationAwarenessApi
}) {
  const [remoteHighlights, setRemoteHighlights] = useState<Map<string, string>>(
    () => new Map()
  )
  const highlightedIdsRef = useRef<Set<string>>(new Set())
  const { diagramId, nodes, edges, previewMode } = useDiagramStore(
    useShallow((state) => ({
      diagramId: state.diagramId,
      nodes: state.nodes,
      edges: state.edges,
      previewMode: state.previewMode,
    }))
  )

  useEffect(() => {
    if (!active) {
      setRemoteHighlights(new Map())
      return
    }

    const unsubscribe = awareness.subscribeToAwarenessChanges((states) => {
      const localClientId = awareness.getLocalAwarenessClientId()
      const next = new Map<string, string>()

      for (const [clientId, state] of states.entries()) {
        if (clientId === localClientId) continue

        const selectedElementId = state?.selectedElementId
        const userColor = state?.user?.color
        if (selectedElementId && userColor) {
          next.set(selectedElementId, userColor)
        }
      }

      setRemoteHighlights(next)
    })

    return unsubscribe
  }, [active, awareness])

  const highlightSignature = useMemo(
    () =>
      Array.from(remoteHighlights.entries())
        .map(([elementId, color]) => `${elementId}:${color}`)
        .sort()
        .join("|"),
    [remoteHighlights]
  )

  useEffect(() => {
    const container = document.getElementById(`react-flow-library-${diagramId}`)
    if (!container) return

    clearHighlights(container, highlightedIdsRef.current)
    highlightedIdsRef.current = new Set()

    if (!active || previewMode) return

    const actuallyHighlighted = new Set<string>()
    for (const [elementId, color] of remoteHighlights.entries()) {
      const targets = getElementTargets(container, elementId)
      if (targets.length === 0) continue

      for (const target of targets) {
        target.style.setProperty(
          "--apollon-collaboration-highlight-color",
          color
        )
        target.classList.add("apollon-collaboration-highlighted")
      }
      actuallyHighlighted.add(elementId)
    }

    highlightedIdsRef.current = actuallyHighlighted

    return () => {
      clearHighlights(container, highlightedIdsRef.current)
      highlightedIdsRef.current = new Set()
    }
  }, [
    active,
    diagramId,
    edges,
    highlightSignature,
    nodes,
    previewMode,
    remoteHighlights,
  ])

  return null
}

export function CollaborationLayer({
  options,
  awareness,
}: CollaborationLayerProps) {
  const previewMode = useDiagramStore((state) => state.previewMode)
  const active = options.enabled && Boolean(options.user)
  const remoteVisualsActive = active && !previewMode

  return (
    <>
      <LocalCollaborationAwareness
        active={active && !previewMode}
        options={options}
        awareness={awareness}
      />
      <CollaboratorPresenceBar
        active={active && options.showPresence}
        awareness={awareness}
      />
      <CollaboratorCursors
        active={remoteVisualsActive && options.showCursors}
        awareness={awareness}
      />
      <CollaboratorSelectionHighlights
        active={remoteVisualsActive && options.showSelectionHighlights}
        awareness={awareness}
      />
    </>
  )
}
