import { Tooltip } from "@/components/ui"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { createPortal } from "react-dom"
import { useOnViewportChange, useReactFlow, useViewport } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { useDiagramStore } from "@/store"
import { useOverlayStore } from "@/store/context"
import { RegionMount } from "@/overlay/RegionMount"
import {
  CollaborationCursor,
  CollaborationState,
  CollaborationUser,
  CollaborationViewport,
  CollaboratorInfo,
} from "@/typings"
import { flowToCanvasPosition } from "./coordinates"

export type CollaborationAwarenessApi = {
  setLocalAwarenessCursor: (cursor: CollaborationCursor | null) => void
  setLocalAwarenessSelectedElement: (selectedElementId: string | null) => void
  setLocalAwarenessViewport: (viewport: CollaborationViewport | null) => void
  setLocalAwarenessFollowing: (followingClientId: number | null) => void
  getAwarenessStates: () => Map<number, CollaborationState>
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
  showFollow: boolean
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

type FollowTarget = {
  clientId: number
  name: string
  color: string
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
  color: "var(--apollon-on-collaboration-cursor, #fff)",
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
  ].filter((element): element is HTMLElement => element !== null)
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
  showFollow,
  followedClientId,
  onToggleFollow,
}: {
  active: boolean
  awareness: CollaborationAwarenessApi
  showFollow: boolean
  followedClientId: number | null
  onToggleFollow: (target: FollowTarget) => void
}) {
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const register = useOverlayStore((s) => s.register)
  const unregister = useOverlayStore((s) => s.unregister)
  const [host] = useState<HTMLDivElement | null>(() =>
    typeof document !== "undefined" ? document.createElement("div") : null
  )

  useEffect(() => {
    if (!active) {
      setCollaborators([])
      return
    }

    const unsubscribe =
      awareness.subscribeToCollaboratorChanges(setCollaborators)

    return unsubscribe
  }, [active, awareness])

  // Count peers whose `followingClientId` points at us. The guarded setState
  // keeps unrelated awareness ticks (e.g. cursor moves) from re-rendering the
  // bar — only an actual change in the follower count does.
  useEffect(() => {
    if (!active || !showFollow) {
      setFollowerCount(0)
      return
    }

    const localClientId = awareness.getLocalAwarenessClientId()
    return awareness.subscribeToAwarenessChanges((states) => {
      let count = 0
      for (const [clientId, state] of states) {
        if (
          clientId !== localClientId &&
          state.followingClientId === localClientId
        ) {
          count += 1
        }
      }
      setFollowerCount((prev) => (prev === count ? prev : count))
    })
  }, [active, showFollow, awareness])

  const remoteCount = collaborators.filter((c) => !c.isLocal).length
  const shouldShow = active && remoteCount > 0

  // Registered as a top-right overlay control (not a hand-positioned absolute
  // div), so the engine places it — clearing header / right-rail bands via the
  // inset-aware corner slot — and deconflicts it with host chrome in that corner.
  useEffect(() => {
    if (!host || !shouldShow) return
    register({
      id: "apollon:presence",
      region: "top-right",
      // Sort before host-composed top-right chrome (lower renders first).
      order: -100,
      render: () => <RegionMount el={host} />,
    })
    return () => unregister("apollon:presence")
  }, [host, shouldShow, register, unregister])

  if (!shouldShow || !host) return null

  const localClientId = awareness.getLocalAwarenessClientId()

  return createPortal(
    <div className="apollon-collaboration-presence-bar">
      {collaborators.map((c, i) => {
        const followTargetId =
          c.isLocal || !showFollow
            ? null
            : (c.clientIds.find((id) => id !== localClientId) ?? null)
        const followTarget: FollowTarget | null =
          followTargetId === null
            ? null
            : { clientId: followTargetId, name: c.name, color: c.color }
        const isFollowable = followTarget !== null
        const isFollowing =
          followedClientId !== null && c.clientIds.includes(followedClientId)
        const isFollowedByOthers = c.isLocal && followerCount > 0
        const label = c.isLocal
          ? isFollowedByOthers
            ? `${c.name} (You · followed by ${followerCount})`
            : `${c.name} (You)`
          : isFollowing
            ? `${c.name} (Following · click to stop)`
            : isFollowable
              ? `${c.name} (click to follow)`
              : c.name

        return (
          <Tooltip key={c.id} title={label}>
            <div
              aria-label={label}
              role={isFollowable ? "button" : undefined}
              aria-pressed={isFollowable ? isFollowing : undefined}
              tabIndex={isFollowable ? 0 : undefined}
              onClick={
                followTarget ? () => onToggleFollow(followTarget) : undefined
              }
              onKeyDown={
                followTarget
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onToggleFollow(followTarget)
                      }
                    }
                  : undefined
              }
              style={{
                ...avatarBase,
                backgroundColor: c.color,
                border: "2px solid var(--apollon-background)",
                marginLeft: i === 0 ? 0 : OVERLAP,
                zIndex: collaborators.length - i,
                cursor: isFollowable ? "pointer" : "default",
                position: "relative",
                boxShadow: isFollowing
                  ? `0 0 0 2px var(--apollon-background), 0 0 0 4px ${c.color}`
                  : undefined,
              }}
            >
              {c.name.charAt(0).toUpperCase()}
              {isFollowedByOthers && (
                <span
                  aria-hidden="true"
                  className="apollon-collaboration-follower-badge"
                  style={{ borderColor: c.color }}
                >
                  {followerCount > 9 ? "9+" : followerCount}
                </span>
              )}
            </div>
          </Tooltip>
        )
      })}
    </div>,
    host
  )
}

// The pointer arrow's tip within its 16x20 viewBox (the path starts at "M2 1").
// Subtracted from the rendered position so the tip lands on the exact point.
const CURSOR_HOTSPOT = { x: 2, y: 1 }

function CollaboratorCursors({
  active,
  awareness,
}: {
  active: boolean
  awareness: CollaborationAwarenessApi
}) {
  const viewport = useViewport()
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
        const canvasPosition = flowToCanvasPosition(
          {
            x: collaborator.x,
            y: collaborator.y,
          },
          viewport
        )

        return (
          <div
            key={collaborator.clientId}
            className="apollon-collaboration-cursor"
            // Offset by the arrow's hotspot so the tip — not the SVG's
            // top-left corner — sits exactly on the collaborator's point.
            style={{
              left: canvasPosition.x - CURSOR_HOTSPOT.x,
              top: canvasPosition.y - CURSOR_HOTSPOT.y,
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
                stroke="var(--apollon-on-collaboration-cursor, #ffffff)"
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

const sameViewport = (
  a: CollaborationViewport | null,
  b: CollaborationViewport | null
) => a != null && b != null && a.x === b.x && a.y === b.y && a.zoom === b.zoom

/**
 * Broadcasts the local viewport to peers so they can follow it, and — while
 * `followedClientId` is set — mirrors that peer's viewport onto the local
 * canvas. Renders nothing; it only runs effects.
 */
function ViewportFollow({
  awareness,
  followedClientId,
  onStopFollowing,
}: {
  awareness: CollaborationAwarenessApi
  followedClientId: number | null
  onStopFollowing: () => void
}) {
  const reactFlow = useReactFlow()

  const pendingViewport = useRef<CollaborationViewport | null>(null)
  const broadcastRaf = useRef(0)
  // True only for the synchronous span of a follow-driven `setViewport`. The
  // change it provokes fires `onChange` immediately (xyflow applies `duration:
  // 0` synchronously), so this flag lets us tell our own programmatic move
  // apart from a real user pan/zoom — without it the follow would echo back to
  // the followed peer, loop on mutual follow, and instantly cancel itself.
  const applyingRemote = useRef(false)
  const lastApplied = useRef<CollaborationViewport | null>(null)

  const flushViewport = useCallback(() => {
    broadcastRaf.current = 0
    if (pendingViewport.current) {
      awareness.setLocalAwarenessViewport(pendingViewport.current)
      pendingViewport.current = null
    }
  }, [awareness])

  // A single `onChange` handles both jobs: a real user pan/zoom hands control
  // back (stops following), and every move is coalesced to one broadcast per
  // frame — mirroring how the cursor broadcaster throttles pointer moves. The
  // `applyingRemote`/`sameViewport` guards keep a follow-applied viewport from
  // tripping either path.
  const handleViewportChange = useCallback(
    (viewport: CollaborationViewport) => {
      if (applyingRemote.current || sameViewport(viewport, lastApplied.current))
        return
      if (followedClientId !== null) onStopFollowing()
      pendingViewport.current = viewport
      if (!broadcastRaf.current) {
        broadcastRaf.current = window.requestAnimationFrame(flushViewport)
      }
    },
    [followedClientId, onStopFollowing, flushViewport]
  )

  useOnViewportChange({ onChange: handleViewportChange })

  // Publish the current viewport once on mount so a peer who follows us snaps
  // to it immediately, even if we haven't panned since joining (`onChange`
  // only fires on subsequent moves).
  useEffect(() => {
    awareness.setLocalAwarenessViewport(reactFlow.getViewport())
  }, [awareness, reactFlow])

  useEffect(
    () => () => {
      if (broadcastRaf.current) {
        window.cancelAnimationFrame(broadcastRaf.current)
      }
    },
    []
  )

  // Reflect who we follow into awareness so the target can show a follower
  // count; clears on unfollow/unmount.
  useEffect(() => {
    awareness.setLocalAwarenessFollowing(followedClientId)
    return () => awareness.setLocalAwarenessFollowing(null)
  }, [awareness, followedClientId])

  // Mirror the followed peer's viewport. `duration: 0` applies instantly — an
  // animated transition would pile up against the ~per-frame stream
  // (xyflow#5077). Drop follow if the peer leaves awareness, and never follow
  // our own client (a no-op that would only publish a self-referential follow).
  useEffect(() => {
    if (followedClientId == null) return
    if (followedClientId === awareness.getLocalAwarenessClientId()) return

    const applyTargetViewport = (states: Map<number, CollaborationState>) => {
      const target = states.get(followedClientId)
      if (!target) {
        onStopFollowing()
        return
      }
      const viewport = target.viewport
      if (!viewport || sameViewport(viewport, lastApplied.current)) return

      lastApplied.current = viewport
      // The flag must always be cleared: a stuck `true` would silently disable
      // take-back and broadcasting for the rest of the session.
      applyingRemote.current = true
      try {
        reactFlow.setViewport(viewport, { duration: 0 })
      } finally {
        applyingRemote.current = false
      }
    }

    // Snap to the target's current viewport right away — `subscribeToAwareness
    // Changes` only fires on *subsequent* changes, so without this following an
    // idle peer wouldn't move at all.
    applyTargetViewport(awareness.getAwarenessStates())
    const unsubscribe =
      awareness.subscribeToAwarenessChanges(applyTargetViewport)

    return () => {
      unsubscribe()
      lastApplied.current = null
    }
  }, [awareness, followedClientId, onStopFollowing, reactFlow])

  return null
}

/**
 * Persistent affordance for an active follow: a frame around the editor in the
 * followed peer's color and a top-center banner naming them with a stop button.
 * `role="status"` announces the follow start to assistive tech.
 */
function FollowIndicator({
  target,
  onStopFollowing,
}: {
  target: FollowTarget
  onStopFollowing: () => void
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="apollon-collaboration-follow-frame"
        style={{ boxShadow: `inset 0 0 0 3px ${target.color}` }}
      />
      <div
        className="apollon-collaboration-follow-banner"
        style={{ borderColor: target.color }}
      >
        <span
          aria-hidden="true"
          className="apollon-collaboration-follow-banner-dot"
          style={{ backgroundColor: target.color }}
        />
        {/* Only the message is the live region, so the Stop button's label
            doesn't leak into the announcement. */}
        <span
          className="apollon-collaboration-follow-banner-text"
          role="status"
        >
          Following {target.name}
        </span>
        <button
          type="button"
          className="apollon-collaboration-follow-banner-stop"
          aria-label={`Stop following ${target.name}`}
          onClick={onStopFollowing}
        >
          Stop
        </button>
      </div>
    </>
  )
}

export function CollaborationLayer({
  options,
  awareness,
}: CollaborationLayerProps) {
  const previewMode = useDiagramStore((state) => state.previewMode)
  const active = options.enabled && options.user !== undefined
  const remoteVisualsActive = active && !previewMode
  const followActive = remoteVisualsActive && options.showFollow

  // The followed peer's name/color are captured at click time (from the
  // presence bar, which already has them) so the banner and editor frame don't
  // need a second awareness lookup.
  const [followTarget, setFollowTarget] = useState<FollowTarget | null>(null)

  const stopFollowing = useCallback(() => setFollowTarget(null), [])
  const toggleFollow = useCallback(
    (target: FollowTarget) =>
      setFollowTarget((prev) =>
        prev?.clientId === target.clientId ? null : target
      ),
    []
  )

  // Forget the follow target whenever following turns off (preview, option
  // toggle) so it can't silently resume on re-enable.
  useEffect(() => {
    if (!followActive) setFollowTarget(null)
  }, [followActive])

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
        showFollow={followActive}
        followedClientId={followTarget?.clientId ?? null}
        onToggleFollow={toggleFollow}
      />
      <CollaboratorCursors
        active={remoteVisualsActive && options.showCursors}
        awareness={awareness}
      />
      <CollaboratorSelectionHighlights
        active={remoteVisualsActive && options.showSelectionHighlights}
        awareness={awareness}
      />
      {followActive && (
        <ViewportFollow
          awareness={awareness}
          followedClientId={followTarget?.clientId ?? null}
          onStopFollowing={stopFollowing}
        />
      )}
      {followActive && followTarget && (
        <FollowIndicator
          target={followTarget}
          onStopFollowing={stopFollowing}
        />
      )}
    </>
  )
}
