import { use, useEffect, useId, useMemo, useRef, useState } from "react"
import { CircleAlert, Network, X } from "lucide-react"
import { useReactFlow, useStore } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import {
  DiagramStoreContext,
  MetadataStoreContext,
  useDiagramStore,
  useMetadataStore,
  useOverlayStore,
} from "@/store/context"
import { Tooltip } from "@/components/ui"
import { useLabels } from "@/i18n/useLabels"
import { isDiagramStateModifiable } from "@/hooks/useDiagramModifiable"
import {
  getDiagramLayoutAvailability,
  getVisibleLayoutEdges,
} from "@/layout/availability"
import { executeArrangeDiagram } from "@/layout/arrangeDiagram"
import type { DiagramLayoutAvailabilityReason } from "@/layout/types"
import { DiagramLayoutError } from "@/layout/workerController"
import { hasManualEdgeRouting } from "@/edges/routingAuthority"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@tumaet/ui/components/alert-dialog"
import { usePortalThemeVars } from "@/components/ui/portalTheme"
import { fitArrangedDiagram } from "@/layout/fitView"

const unavailableLabel = (
  reason: DiagramLayoutAvailabilityReason,
  labels: ReturnType<typeof useLabels>
): string => {
  switch (reason) {
    case "nested-nodes":
      return labels.arrangeDiagramNestedNodes
    case "interaction-active":
      return labels.arrangeDiagramInteractionActive
    case "too-large":
      return labels.arrangeDiagramTooLarge
    default:
      return labels.arrangeDiagramUnavailable
  }
}

export function DiagramLayoutControl() {
  const reactFlow = useReactFlow()
  const diagramStore = use(DiagramStoreContext)!
  const metadataStore = use(MetadataStoreContext)!
  const t = useLabels()
  const rfNodes = useStore((state) => state.nodes)
  const edges = useDiagramStore((state) => state.edges)
  const interactionActive = rfNodes.some(
    (node) => node.dragging || node.resizing
  )
  const metadata = useMetadataStore(
    useShallow((state) => ({
      readonly: state.readonly,
      mode: state.mode,
      view: state.view,
      diagramType: state.diagramType,
      liveEdgeOverride: state.liveEdgeOverride,
      pendingConnectionEdge: state.pendingConnectionEdge,
      pendingConnectionId: state.pendingConnectionId,
    }))
  )
  const modifiable = isDiagramStateModifiable(metadata)
  const edgeInteractionActive =
    metadata.liveEdgeOverride !== null ||
    metadata.pendingConnectionEdge !== null ||
    metadata.pendingConnectionId !== null
  const availability = useMemo(
    () =>
      getDiagramLayoutAvailability({
        nodes: rfNodes,
        edges,
        modifiable,
        interactionActive: interactionActive || edgeInteractionActive,
      }),
    [rfNodes, edges, modifiable, interactionActive, edgeInteractionActive]
  )
  const manualRouteCount = useMemo(
    () =>
      getVisibleLayoutEdges(rfNodes, edges).filter(hasManualEdgeRouting).length,
    [rfNodes, edges]
  )
  const { insets, safeArea } = useOverlayStore(
    useShallow((state) => ({
      insets: state.insets,
      safeArea: state.safeArea,
    }))
  )
  const [running, setRunning] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [failed, setFailed] = useState(false)
  const [triggerElement, setTriggerElement] =
    useState<HTMLButtonElement | null>(null)
  const portalThemeVars = usePortalThemeVars(triggerElement)
  const cancelRef = useRef<(() => void) | null>(null)
  const confirmationCancelRef = useRef<HTMLButtonElement | null>(null)
  const focusReturnTimerRef = useRef<number | null>(null)
  const descriptionId = useId()

  useEffect(
    () => () => {
      cancelRef.current?.()
      if (focusReturnTimerRef.current !== null)
        window.clearTimeout(focusReturnTimerRef.current)
    },
    []
  )

  const updateConfirmationOpen = (open: boolean) => {
    setConfirmationOpen(open)
    if (focusReturnTimerRef.current !== null)
      window.clearTimeout(focusReturnTimerRef.current)
    focusReturnTimerRef.current = open
      ? null
      : window.setTimeout(() => {
          triggerElement?.focus()
          focusReturnTimerRef.current = null
        })
  }

  // Empty/read-only/unmeasured canvases do not get inert chrome. Nesting
  // remains visible-but-disabled because the tooltip tells the user exactly
  // what prevents arrangement.
  if (
    !running &&
    !availability.available &&
    (availability.reason === "not-modifiable" ||
      availability.reason === "not-enough-nodes" ||
      availability.reason === "unmeasured-nodes")
  )
    return null

  const run = (replaceManualRoutes: boolean) => {
    if (!availability.available) return

    setFailed(false)
    setRunning(true)
    setAnnouncement(t.arrangingDiagram)
    const execution = executeArrangeDiagram({
      diagramStore,
      reactFlow,
      isModifiable: () => {
        const current = metadataStore.getState()
        return isDiagramStateModifiable(current)
      },
      isInteractionActive: () => {
        const current = metadataStore.getState()
        return (
          current.liveEdgeOverride !== null ||
          current.pendingConnectionEdge !== null ||
          current.pendingConnectionId !== null
        )
      },
      getDiagramType: () => metadataStore.getState().diagramType,
      replaceManualRoutes,
    })
    cancelRef.current = execution.cancel
    void execution.result
      .then((result) => {
        if (result.status === "stale") setAnnouncement(t.arrangeDiagramStale)
        else if (result.status === "unchanged")
          setAnnouncement(t.arrangeDiagramUnchanged)
        else if (result.status === "applied") {
          if (result.movedNodeCount > 0)
            fitArrangedDiagram(reactFlow, insets, safeArea)
          setAnnouncement(
            result.replacedManualRouteCount > 0
              ? result.movedNodeCount > 0
                ? t.arrangeDiagramAppliedWithRoutingReset(
                    result.replacedManualRouteCount
                  )
                : t.arrangeDiagramRoutingResetOnly(
                    result.replacedManualRouteCount
                  )
              : t.arrangeDiagramApplied
          )
        } else if (result.status === "confirmation-required") {
          setAnnouncement("")
          setConfirmationOpen(true)
        } else setAnnouncement(unavailableLabel(result.reason, t))
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          setAnnouncement(t.arrangeDiagramCancelled)
          return
        }
        setFailed(true)
        setAnnouncement(
          error instanceof DiagramLayoutError && error.code === "timeout"
            ? t.arrangeDiagramTimeout
            : error instanceof DiagramLayoutError &&
                error.code === "worker-start"
              ? t.arrangeDiagramWorkerUnavailable
              : t.arrangeDiagramFailed
        )
      })
      .finally(() => {
        cancelRef.current = null
        setRunning(false)
      })
  }

  const start = () => {
    if (running) {
      cancelRef.current?.()
      return
    }
    if (!availability.available) return
    if (manualRouteCount > 0) {
      setConfirmationOpen(true)
      return
    }
    run(false)
  }

  const title = running
    ? t.cancelArrangeDiagram
    : !availability.available
      ? unavailableLabel(availability.reason, t)
      : manualRouteCount > 0
        ? t.arrangeDiagramManualRoutingConfirmationHint(manualRouteCount)
        : announcement || t.arrangeDiagramHint

  return (
    <>
      <div className="apollon-glass apollon-chrome-cluster" aria-busy={running}>
        <Tooltip title={title}>
          <span>
            <button
              ref={setTriggerElement}
              type="button"
              className="apollon-chrome-iconbtn"
              onClick={start}
              aria-disabled={!running && !availability.available}
              aria-describedby={descriptionId}
              aria-label={running ? t.cancelArrangeDiagram : t.arrangeDiagram}
            >
              {running ? (
                <X width={18} height={18} aria-hidden="true" />
              ) : failed ? (
                <CircleAlert width={18} height={18} aria-hidden="true" />
              ) : (
                <Network width={18} height={18} aria-hidden="true" />
              )}
            </button>
          </span>
        </Tooltip>
      </div>
      <span id={descriptionId} className="apollon-visually-hidden">
        {title}
      </span>
      <span
        className="apollon-visually-hidden"
        role={failed ? "alert" : "status"}
        aria-live={failed ? "assertive" : "polite"}
      >
        {announcement}
      </span>
      <AlertDialog
        open={confirmationOpen}
        onOpenChange={updateConfirmationOpen}
      >
        <AlertDialogContent
          initialFocus={confirmationCancelRef}
          style={portalThemeVars}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.arrangeDiagramManualRoutingConfirmationTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.arrangeDiagramManualRoutingConfirmationDescription(
                manualRouteCount
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={confirmationCancelRef}>
              {t.arrangeDiagramManualRoutingConfirmationCancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => run(true)}>
              {t.arrangeDiagramManualRoutingConfirmationConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
