import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useMetadataStore } from "@/store/context"
import { CANVAS } from "@/constants"
import { useStore } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { ConnectHandles } from "@/nodes/handles/ConnectHandles"

interface Props {
  children: React.ReactNode
  /** Accepted for call-site convenience; geometry is read from the store. */
  width?: number
  height?: number
  elementId: string
  className?: string
}

/**
 * Shared wrapper for rectangular/elliptical nodes. Renders the connection
 * handles (driven by the per-node-type config, see nodeHandleConfig.ts) plus
 * the assessment/feedback wrappers. Connection points, their zoom-aware level
 * of detail and grid alignment all live in lib/nodes/handles.
 */
export function DefaultNodeWrapper({ elementId, children, className }: Props) {
  // Subscribe narrowly so a node re-renders its handles on resize/type change
  // but not on the position/selection churn of subscribing to the whole node.
  const { nodeType, nodeWidth, nodeHeight } = useStore(
    useShallow((s) => {
      const n = s.nodeLookup.get(elementId)
      return {
        nodeType: n?.type,
        nodeWidth: n?.width ?? 0,
        nodeHeight: n?.height ?? 0,
      }
    })
  )
  const isDiagramModifiable = useDiagramModifiable()

  const zoom = useStore((state) => state.transform[2])
  const safeZoom = Math.max(
    Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    CANVAS.MIN_SCALE_TO_ZOOM_OUT
  )

  const {
    connectionGuidanceActive,
    connectionGuidanceSourceNodeId,
    connectionGuidanceSourceHandleId,
  } = useMetadataStore(
    useShallow((state) => ({
      connectionGuidanceActive: state.connectionGuidanceActive,
      connectionGuidanceSourceNodeId: state.connectionGuidanceSourceNodeId,
      connectionGuidanceSourceHandleId: state.connectionGuidanceSourceHandleId,
    }))
  )

  const guidanceSourceHandleId =
    connectionGuidanceActive && elementId === connectionGuidanceSourceNodeId
      ? connectionGuidanceSourceHandleId
      : null

  return (
    <AssessmentSelectableWrapper elementId={elementId}>
      <FeedbackDropzone
        className={className}
        elementId={elementId}
        asElement="div"
        elementType={nodeType}
      >
        <ConnectHandles
          elementId={elementId}
          nodeType={nodeType}
          width={nodeWidth}
          height={nodeHeight}
          isDiagramModifiable={isDiagramModifiable}
          zoom={safeZoom}
          guidanceSourceHandleId={guidanceSourceHandleId}
        />

        {children}
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
