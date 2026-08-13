import {
  INTERACTIVE_SELECTION_COLOR,
  INTERACTIVE_SELECTION_FILL,
  INTERACTIVE_SELECTION_FILL_FAINT,
  INTERACTIVE_SELECTION_STROKE_SOFT,
} from "@/constants"
import { useAssessmentSelection } from "@/hooks"
import {
  useAssessmentSelectionStore,
  useDiagramStore,
  useMetadataStore,
} from "@/store"
import { ApollonMode, ApollonView } from "@/typings"
import { FC } from "react"
import { useShallow } from "zustand/shallow"

interface AssessmentSelectableElementProps {
  elementId: string
  width: number
  itemHeight: number
  yOffset?: number
  /**
   * The row's assessment badge, if it has one. A separate slot rather than part
   * of `children` because SVG paints in document order: the selection tint has
   * to sit ABOVE the row it marks and BELOW the badge that says what the mark is
   * about. Putting the badge in `children` forces one or the other.
   */
  badge?: React.ReactNode
  /**
   * Whether this row draws the host highlight. Off where the row IS the node —
   * a class header carries the node's own id, and the node wrapper already rings
   * the whole node, so drawing it here too gave a class a second inner ring that
   * no other node type has.
   */
  highlightable?: boolean
  children: React.ReactNode
}

export const AssessmentSelectableElement: FC<
  AssessmentSelectableElementProps
> = ({
  elementId,
  width,
  itemHeight,
  yOffset = 0,
  highlightable = true,
  badge,
  children,
}) => {
  const { mode, readonly, view } = useMetadataStore(
    useShallow((state) => ({
      mode: state.mode,
      readonly: state.readonly,
      view: state.view,
    }))
  )
  const { isInteractiveSelected, toggleInteractiveElement } = useDiagramStore(
    useShallow((state) => ({
      isInteractiveSelected:
        state.interactiveElements[elementId] ||
        state.interactiveRelationships[elementId] ||
        false,
      toggleInteractiveElement: state.toggleInteractiveElement,
    }))
  )
  const {
    isSelected,
    isHighlighted,
    showAssessmentInteraction,
    handleElementClick,
    handleElementMouseEnter,
    handleElementMouseLeave,
  } = useAssessmentSelection(elementId)

  // Host-driven highlight (see `highlightedElements` in the store), drawn as a
  // ring rather than a fill.
  //
  // SVG has no z-index: paint order is document order, and this rect has to come
  // after `children` to sit above the row's own background. A filled rect there
  // covers everything the row drew — its text, and the assessment badge at its
  // edge — which is the one thing a highlight must never do, since the badge is
  // what it is pointing at. An inset stroke marks the row just as clearly.
  const highlightColor = useAssessmentSelectionStore(
    (state) => state.highlightedElements[elementId]
  )
  const HIGHLIGHT_RING_WIDTH = 2
  const highlightRect =
    highlightColor && highlightable ? (
      <rect
        aria-hidden
        x={HIGHLIGHT_RING_WIDTH / 2}
        y={yOffset + HIGHLIGHT_RING_WIDTH / 2}
        width={Math.max(width - HIGHLIGHT_RING_WIDTH, 0)}
        height={Math.max(itemHeight - HIGHLIGHT_RING_WIDTH, 0)}
        fill="none"
        stroke={highlightColor}
        strokeWidth={HIGHLIGHT_RING_WIDTH}
        rx={2}
        pointerEvents="none"
      />
    ) : null

  const showInteractiveInteraction =
    mode === ApollonMode.Modelling &&
    view === ApollonView.Highlight &&
    !readonly

  if (showInteractiveInteraction) {
    const handleInteractivePointerDown = (
      e: React.PointerEvent<SVGGElement>
    ) => {
      e.stopPropagation()
      e.preventDefault()
      toggleInteractiveElement(elementId)
    }

    return (
      <g
        className="nodrag nopan"
        data-apollon-element-id={elementId}
        style={{ cursor: "pointer" }}
        onPointerDown={handleInteractivePointerDown}
      >
        {children}
        {isInteractiveSelected && (
          <rect
            x={0}
            y={yOffset}
            width={width}
            height={itemHeight}
            fill={INTERACTIVE_SELECTION_COLOR}
            fillOpacity={0.18}
            stroke={INTERACTIVE_SELECTION_COLOR}
            strokeWidth={2}
            rx={2}
            pointerEvents="none"
          />
        )}
        {badge}
      </g>
    )
  }

  if (!showAssessmentInteraction) {
    return (
      <g data-apollon-element-id={elementId}>
        {children}
        {highlightRect}
        {badge}
      </g>
    )
  }

  const handleSVGClick = (e: React.PointerEvent<SVGGElement>) => {
    handleElementClick(e as React.PointerEvent<Element>)
  }

  return (
    <g
      className="nodrag nopan"
      data-apollon-element-id={elementId}
      style={{
        cursor: showAssessmentInteraction ? "pointer" : "default",
      }}
      onPointerDown={handleSVGClick}
      onMouseEnter={handleElementMouseEnter}
      onMouseLeave={handleElementMouseLeave}
    >
      {children}
      {(isSelected || isHighlighted) && (
        <rect
          x={0}
          y={yOffset}
          width={width}
          height={itemHeight}
          fill={
            isSelected
              ? INTERACTIVE_SELECTION_FILL
              : INTERACTIVE_SELECTION_FILL_FAINT
          }
          stroke={
            isSelected
              ? INTERACTIVE_SELECTION_COLOR
              : INTERACTIVE_SELECTION_STROKE_SOFT
          }
          strokeWidth={isSelected ? 2 : 1}
          rx={2}
          pointerEvents="none"
        />
      )}
      {highlightRect}
      {badge}
    </g>
  )
}
